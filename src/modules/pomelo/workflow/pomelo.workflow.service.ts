import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PomeloTransaction } from "../domain/PomeloTransaction";
import { PomeloRepo } from "../repos/pomelo.repo";
import { POMELO_REPO_PROVIDER } from "../repos/pomelo.repo.module";

@Injectable()
export class PomeloWorkflowService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(POMELO_REPO_PROVIDER) private readonly pomeloRepo: PomeloRepo,
  ) {}

  async getPomeloTransactionByPomeloTransactionID(pomeloTransactionID: string): Promise<PomeloTransaction> {
    return this.pomeloRepo.getPomeloTransactionByPomeloTransactionID(pomeloTransactionID);
  }

  async getPomeloUserTransactionsForSettlementDate(
    pomeloUserID: string,
    settlementDate: string,
  ): Promise<PomeloTransaction[]> {
    return this.pomeloRepo.getPomeloUserTransactionsForSettlementDate(pomeloUserID, settlementDate);
  }
}
