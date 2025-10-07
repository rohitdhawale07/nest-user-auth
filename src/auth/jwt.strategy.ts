import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'), // same as in JwtModule.register()
        });
    }

    async validate(payload: any) {
        // this function runs automatically if JWT is valid
        // payload = what you signed earlier in jwtService.sign(payload)
        return { userId: payload.sub, email: payload.email, role: payload.role }; // appended to request object as req.user
    }
}
