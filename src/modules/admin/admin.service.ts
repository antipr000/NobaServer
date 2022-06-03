import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { DBProvider } from "../../infraproviders/DBProvider";
import { Logger } from "winston";
import { IAdminTransactionRepo } from "./repos/transactions/AdminTransactionRepo";
import { TransactionStatsDTO } from "./dto/TransactionStats";
import { TransactionDTO } from "../transactions/dto/TransactionDTO";
import { Transaction } from "../transactions/domain/Transaction";
import { TransactionMapper } from "../transactions/mapper/TransactionMapper";




@Injectable()
export class AdminService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject('AdminTransactionRepo')
  private readonly adminTransactionRepo: IAdminTransactionRepo;

  private readonly transactionsMapper: TransactionMapper;

  constructor() {
    this.transactionsMapper = new TransactionMapper();
  }

  async getTransactionStatus(): Promise<TransactionStatsDTO> {
    return await this.adminTransactionRepo.getTransactionStats();
  }

  async getAllTransactions(startDate: string, endDate: string): Promise<TransactionDTO[]> {
    const transactions: Transaction[] = await this.adminTransactionRepo.getAllTransactions(startDate, endDate);
    return transactions.map(transaction => this.transactionsMapper.toDTO(transaction));
  }

}
