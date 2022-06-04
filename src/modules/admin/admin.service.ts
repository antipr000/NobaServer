import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IAdminTransactionRepo } from "./repos/transactions/AdminTransactionRepo";
import { TransactionStatsDTO } from "./dto/TransactionStats";
import { TransactionDTO } from "../transactions/dto/TransactionDTO";
import { Transaction } from "../transactions/domain/Transaction";
import { TransactionMapper } from "../transactions/mapper/TransactionMapper";
import { Admin, AllRoles, isValidRole } from "./domain/Admin";


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

  async addNobaAdmin(nobaAdmin: Admin): Promise<Admin> {
    const adminWithSameEmail =
      await this.adminTransactionRepo.getNobaAdminByEmail(nobaAdmin.props.email);
    if (adminWithSameEmail !== undefined) {
      return undefined;
    }

    return this.adminTransactionRepo.addNobaAdmin(nobaAdmin);
  }

  async changeNobaAdminRole(adminEmail: string, newRole: string): Promise<Admin> {
    if (!isValidRole(newRole))
      throw new BadRequestException(`Role should be one of ${AllRoles}.`);

    const adminState: Admin = await this.adminTransactionRepo.getNobaAdminByEmail(adminEmail);

    if (adminState === undefined)
      throw new NotFoundException(`Admin with email '${adminEmail}' doesn't exists.`);

    if (adminState.props.role === newRole)
      return adminState;

    adminState.props.role = newRole;
    return this.adminTransactionRepo.updateNobaAdmin(adminState);
  }

  async deleteNobaAdmin(adminId: string): Promise<boolean> {
    const deletedRecords = await this.adminTransactionRepo.deleteNobaAdmin(adminId);
    if (deletedRecords !== 1)
      throw new NotFoundException(`User with ID '${adminId} not found.`);

    return true;
  }
}
