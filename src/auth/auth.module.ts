import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

@Module({
    imports: [
        ConfigModule,
        PassportModule,
        JwtModule.register({}), // ✅ Empty because config is handled in strategy
    ],
    providers: [JwtStrategy],
    exports: [PassportModule, JwtStrategy],
})
export class AuthModule { }
