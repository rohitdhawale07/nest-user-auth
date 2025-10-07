import { Injectable, ConflictException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { JwtService } from '@nestjs/jwt';

export interface LoginResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    token: string;
  };
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
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
    });

    return this.userRepository.save(user);
  }

  /************************************ LOGIN ***********************************/

  // Return token object on success
  async login(email: string, password: string): Promise<LoginResponse> {

    //fetch user from DB
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    //compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    //sign JWT
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        token,
      },
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
}
