import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
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

  @Inject("AdminTransactionRepo")
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
    const adminWithSameEmail = await this.adminTransactionRepo.getNobaAdminByEmail(nobaAdmin.props.email);
    if (adminWithSameEmail !== undefined) {
      return undefined;
    }

    return this.adminTransactionRepo.addNobaAdmin(nobaAdmin);
  }

  async updateNobaAdmin(adminId: string, targetRole: string, targetName: string): Promise<Admin> {
    if (!isValidRole(targetRole)) {
      throw new BadRequestException(`Role should be one of ${AllRoles}.`);
    }
    if (targetName === undefined || targetName === "" || targetName === null) {
      throw new BadRequestException("Name should be not empty.");
    }

    const adminState: Admin = await this.adminTransactionRepo.getNobaAdminById(adminId);
    if (adminState === undefined) {
      throw new NotFoundException(`Admin with ID '${adminId}' doesn't exists.`);
    }

    adminState.props.role = targetRole;
    adminState.props.name = targetName;
    return this.adminTransactionRepo.updateNobaAdmin(adminState);
  }

  async deleteNobaAdmin(adminId: string): Promise<string> {
    const deletedRecords = await this.adminTransactionRepo.deleteNobaAdmin(adminId);
    if (deletedRecords !== 1) throw new NotFoundException(`User with ID '${adminId} not found.`);

    return adminId;
  }

  async getAdminByEmail(email: string): Promise<Admin> {
    const admin: Admin | undefined = await this.adminTransactionRepo.getNobaAdminByEmail(email);
    if (admin === undefined) {
      throw new NotFoundException(`Admin with email '${email}' is not found.`);
    }
    return admin;
  }

  async getAdminById(id: string): Promise<Admin> {
    return this.adminTransactionRepo.getNobaAdminById(id);
  }
}
