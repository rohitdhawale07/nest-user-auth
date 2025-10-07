import { Body, Controller, Post, UseGuards, Get, Req, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  //***************User Registration*****************//

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.userService.register(registerDto.name, registerDto.email, registerDto.password);
  }

  //****************User Login***********************//

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto.email, loginDto.password);
  }

  //****************Get User Profile******************//

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    return this.userService.getProfile(req.user);
  }

  //************Get All Users (Admin Only)**************//

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('all')
  async getAllUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('sort') sort = 'createdAt',
    @Query('order') order: 'ASC' | 'DESC' = 'ASC',
    @Query('search') search: string,
  ) {
    return this.userService.getAllUsers({
      page: Number(page),
      limit: Number(limit),
      sort,
      order: (String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
      search,
    });
  }

  //****************Refresh Token******************//

  @Post('refresh')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.userService.refreshToken(refreshToken);
  }

  //****************User Logout******************//

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req) {
    return this.userService.logout(req.user.userId);
  }
}
