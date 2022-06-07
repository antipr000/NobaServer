import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { jwtConstants } from "./constants";
import { UserService } from "../user/user.service";
import { UserMapper } from "../user/mappers/UserMapper";
import { UserProps } from "../user/domain/User";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private userMapper: UserMapper;
    constructor(
        private userService: UserService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret
        });
        this.userMapper = new UserMapper();
    }

    async validate(payload: any): Promise<UserProps> {
        const email = payload.email;
        // TODO: based on type, find the proper domain.
        const userResult = await this.userService.findUserByEmailOrPhone(email);
        return userResult.getValue().props;
    }
}