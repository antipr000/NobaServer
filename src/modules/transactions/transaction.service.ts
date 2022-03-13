import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";



@Injectable()
export class TransactionService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;


  constructor(dbProvider: DBProvider) {
    return this;
  }

  async getTransactionStatus(id: string): Promise<string> {
    return null;
  }
}
