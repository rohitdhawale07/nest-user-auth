import { Injectable, ConflictException, Logger, UnauthorizedException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { paginateAndSearch } from 'src/common/utils/pagination.util';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

export interface LoginResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @Inject('CACHE_SERVICE') private readonly cacheClient: ClientProxy,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  /********************************** REGISTER **********************************/

  async register(name: string, email: string, password: string): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save user
    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      role: 'user', // default role
    });

    return this.userRepository.save(user);
  }

  /************************************ LOGIN ***********************************/

  // Return token object on success
  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid email or password');

    const payload = { sub: user.id, email: user.email, role: user.role };

    //Use ConfigService for both secrets
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '1d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(user.id, { refreshToken: hashedRefresh });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  /********************************* GET PROFILE *********************************/

  async getProfile(user: any): Promise<{ message: String, user: Object }> {
    const foundUser = await this.userRepository.findOne({
      where: { id: user.userId },
      select: ['id', 'name', 'email', 'createdAt', 'updatedAt'] // exclude password
    },
    );
    if (!foundUser) {
      throw new UnauthorizedException('User not found');
    }
    return {
      message: 'Profile fetched successfully',
      user: foundUser,
    };
  }

  /**************************** GET ALL USERS (Admin) ****************************/

  async getAllUsers(options: {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
    search?: string;
  }) {
    try {
      const cacheKey = `users_${options.page}_${options.limit}_${options.sort}_${options.order}_${options.search || 'all'}`;

      let cachedData = null;

      try {
        cachedData = await firstValueFrom(
          this.cacheClient.send({ cmd: 'get_cache' }, cacheKey).pipe(
            // Set a timeout for the cache response
            // If cache service is down or slow, we won't wait indefinitely
            // This requires rxjs/operators to be imported if not already
            // e.g., import { timeout } from 'rxjs/operators';
            // timeout(500), // 500ms timeout
            timeout(500), // 500ms timeout
            catchError(() => of(null)),
          ));
      } catch (err) {
        console.warn('Cache service unavailable. Proceeding without cache:', err.message);
      }

      if (cachedData) {
        console.log(`--- Fetching from CACHE for key: ${cacheKey}`);
        return cachedData;
      }

      console.log(`--- Fetching from DB for key: ${cacheKey}`);
      const query = this.userRepository.createQueryBuilder('user');
      const result = await paginateAndSearch(query, {
        page: options.page,
        limit: options.limit,
        sort: options.sort,
        order: options.order,
        search: options.search,
        searchableColumns: ['name', 'email', 'role'],
      });

      // Try to cache result, but don't break if cache service is down
      try {
        await firstValueFrom(
          this.cacheClient.send(
            { cmd: 'set_cache' },
            { key: cacheKey, value: result, ttl: 60 },
          ),
        );
      } catch (err) {
        console.warn(' Could not store in cache:', err.message);
      }

      return result;
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch users');
    }
  }


  /***************************** REFRESH TOKEN JWT *****************************/

  async refreshToken(token: string) {
    try {
      this.logger.log(`Verifying refresh token: ${token}`);
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      this.logger.log(`Decoded refresh token: ${JSON.stringify(decoded)}`);

      const user = await this.userRepository.findOne({ where: { id: decoded.sub } });
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isMatch = await bcrypt.compare(token, user.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const payload = { sub: user.id, email: user.email, role: user.role };

      const newAccessToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '1h',
      });

      const newRefreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      });

      const hashedRefresh = await bcrypt.hash(newRefreshToken, 10);
      await this.userRepository.update(user.id, { refreshToken: hashedRefresh });

      return {
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /******************************* USER LOGOUT *******************************/

  async logout(userId: number): Promise<{ message: string }> {

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    await this.userRepository.update(userId, { refreshToken: null })
    return { message: 'Logout successful' };
  }

  /************************* UPLOAD PROFILE PICTURE *************************/

  async uploadProfile(user: any, file: Express.Multer.File, req: any) {
    if (!file) {
      throw new UnauthorizedException('No file uploaded');
    }

    const userToUpdate = await this.userRepository.findOne({ where: { id: user.userId } });
    if (!userToUpdate) {
      throw new UnauthorizedException('User not found');
    }

    const profileImagePath = file.path; // Store the file path or URL

    await this.userRepository.update(user.userId, { profileImage: profileImagePath });

    const imageUrl = `${req.protocol}://${req.get('host')}/${file.path.replace(/\\/g, '/')}`;

    return {
      message: 'Profile picture uploaded successfully',
      profileImage: imageUrl,
    };
  }
}
