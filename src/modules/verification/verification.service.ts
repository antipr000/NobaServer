import {
    Inject,
    Injectable,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Status } from "../../externalclients/idvproviders/definitions";
import { Logger } from "winston";
import { UserService } from "../user/user.service";
import { VerificationResultDTO } from "./dto/VerificationResultDTO";



@Injectable()
export class VerificationService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;


    constructor(private userService: UserService) {
        return this;
    }

    async updateIdVerificationStatus(verificationResult: VerificationResultDTO, userID: string, email: string) {
        if(verificationResult.status === Status.OK) {
            await this.userService.updateUser({
                _id: userID,
                idVerified: true,
                email: email
            });
        }
    }

    async getVerificationStatus(id: string): Promise<string> {
        return null;
    }
}