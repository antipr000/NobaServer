import {
    BadRequestException,
    Inject,
    Injectable,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { UserService } from "../user/user.service";
import { UserVerificationStatus } from "../user/domain/UserVerificationStatus";
import { UserProps } from "../user/domain/User";
import { TransactionLimitBuyOnly } from "./domain/Limits";

@Injectable()
export class LimitsService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;


    constructor(private userService: UserService) {
        return this;
    }

    async canMakeTransaction(user: UserProps, transactionAmount: number): Promise<boolean> {

        switch(this.userService.getVerificationStatus(user)) {
            case UserVerificationStatus.VERIFIED:
                // transaction level
                if(transactionAmount > TransactionLimitBuyOnly.max_amount_limit) return false;
                break;
            case UserVerificationStatus.PARTIALLY_VERIFIED:
                // transaction level
                if(transactionAmount > TransactionLimitBuyOnly.partial_kyc_max_amount_limit) return false;
                break;
            case UserVerificationStatus.NOT_VERIFIED:
                // transaction level
                if(transactionAmount > TransactionLimitBuyOnly.no_kyc_max_amount_limit) return false;
                break;
            default:
                throw new BadRequestException("User verification status is not valid");
        };
        return true;
    }
}