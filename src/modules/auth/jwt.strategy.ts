import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { jwtConstants } from "./constants";
import { UserDTO } from "../user/dto/UserDTO";
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

    async validate(payload: any): Promise<UserDTO> {
        const email = payload.email;
        return this.userMapper.toDTO(await this.userService.findOne(email));
    }
}