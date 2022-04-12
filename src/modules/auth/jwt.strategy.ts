import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { jwtConstants } from "./constants";
import { User } from "./domain/User";
import { UserService } from "../user/user.service";
import { UserMapper } from "../user/mappers/UserMapper";

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

    async validate(payload: any): Promise<User> {
        const email = payload.email;
        const user = await this.userService.findOne(email);
        return user.props;
    }
}