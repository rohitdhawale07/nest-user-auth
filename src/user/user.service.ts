import { Injectable, ConflictException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { paginateAndSearch } from 'src/common/utils/pagination.util';

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
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '1h',
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
      const query = this.userRepository.createQueryBuilder('user');

      // Call the global pagination utility
      const result = await paginateAndSearch(query, {
        page: options.page,
        limit: options.limit,
        sort: options.sort,
        order: options.order,
        search: options.search,
        searchableColumns: ['name', 'email', 'role'], // dynamic search across multiple fields
      });

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
}
