import {
    Inject,
    Injectable,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";



@Injectable()
export class VerificationService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;


    constructor() {
        return this;
    }

    async getTransactionStatus(id: string): Promise<string> {
        return null;
    }
}