import {
    Inject,
    Injectable,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { UserService } from "../user/user.service";



@Injectable()
export class VerificationService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;


    constructor(private userService: UserService) {
        return this;
    }
}