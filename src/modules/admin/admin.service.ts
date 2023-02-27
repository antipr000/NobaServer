import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IAdminRepo } from "./repos/transactions/sql.admin.repo";
import { TransactionStatsDTO } from "./dto/TransactionStats";
import { Admin, AllRoles, isValidRole } from "./domain/Admin";

@Injectable()
export class AdminService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("AdminTransactionRepo")
  private readonly adminRepo: IAdminRepo;

  constructor() {}

  async getTransactionStatus(): Promise<TransactionStatsDTO> {
    return this.adminRepo.getTransactionStats();
  }

  /*
  TODO: This needs to be rewritten to consider the Consumer parameter required in the mapping service
  async getAllTransactions(startDate: string, endDate: string): Promise<TransactionDTO[]> {
    const transactions: Transaction[] = await this.adminRepo.getAllTransactions(startDate, endDate);
    return transactions.map(transaction => this.transactionMapperService.toTransactionDTO(transaction));
  }
  */

  async addNobaAdmin(nobaAdmin: Admin): Promise<Admin> {
    const adminWithSameEmail = await this.adminRepo.getNobaAdminByEmail(nobaAdmin.props.email);
    if (adminWithSameEmail !== undefined) {
      return undefined;
    }

    return this.adminRepo.addNobaAdmin(nobaAdmin);
  }

  async updateNobaAdmin(adminId: string, targetRole: string, targetName: string): Promise<Admin> {
    if (!isValidRole(targetRole)) {
      throw new BadRequestException(`Role should be one of ${AllRoles}.`);
    }
    if (targetName === undefined || targetName === "" || targetName === null) {
      throw new BadRequestException("Name should be not empty.");
    }

    const adminState: Admin = await this.adminRepo.getNobaAdminById(adminId);
    if (adminState === undefined) {
      throw new NotFoundException(`Admin with ID '${adminId}' doesn't exists.`);
    }

    return this.adminRepo.updateNobaAdmin(adminId, {
      role: targetRole,
      name: targetName,
    });
  }

  async deleteNobaAdmin(adminId: string): Promise<string> {
    await this.adminRepo.deleteNobaAdmin(adminId);

    return adminId;
  }

  async getAdminByEmail(email: string): Promise<Admin> {
    console.log("Getting admin by email");
    const admin: Admin | undefined = await this.adminRepo.getNobaAdminByEmail(email);
    if (admin === undefined) {
      throw new NotFoundException(`Admin with email '${email}' is not found.`);
    }
    return admin;
  }

  async getAdminById(id: string): Promise<Admin> {
    return this.adminRepo.getNobaAdminById(id);
  }

  async getBalanceForAccounts(
    
  ): Promise<any> {
    return this.adminRepo.getBalanceForAccounts();
  }
}
