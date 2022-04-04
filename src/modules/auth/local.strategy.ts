import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UserDTO } from "../user/dto/UserDTO";
import { AuthenticatedUser } from "./domain/AuthenticatedUser";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({
            usernameField: 'email',
            passwordField: 'otp'
        });
    }

    async validate(email: string, otp: number): Promise<AuthenticatedUser> {
        const user = await this.authService.validateUser(email, otp);
        if(!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}