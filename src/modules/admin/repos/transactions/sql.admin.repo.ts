import { TransactionStatsDTO } from "../../dto/TransactionStats";
import { Transaction } from "../../../transaction/domain/Transaction";
import { Inject, Injectable } from "@nestjs/common";
import { Admin, AdminProps } from "../../domain/Admin";
import { AdminMapper } from "../../mappers/AdminMapper";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { AdminRepoMapper } from "../../mappers/AdminRepoMapper";
import { BadRequestError } from "../../../../core/exception/CommonAppException";

export interface IAdminRepo {
  getTransactionStats(): Promise<TransactionStatsDTO>;
  getAllTransactions(startDate: string, endDate: string): Promise<Transaction[]>;
  addNobaAdmin(nobaAdmin: Admin): Promise<Admin>;
  getNobaAdminByEmail(email: string): Promise<Admin>;
  updateNobaAdmin(id: string, adminProps: Partial<AdminProps>): Promise<Admin>;
  deleteNobaAdmin(id: string): Promise<void>;
  getNobaAdminById(id: string): Promise<Admin>;
}

@Injectable()
export class SQLAdminRepo implements IAdminRepo {
  @Inject()
  private readonly adminMapper: AdminMapper;

  @Inject()
  private readonly prismaService: PrismaService;

  private readonly adminRepoMapper: AdminRepoMapper;

  constructor() {
    this.adminRepoMapper = new AdminRepoMapper();
  }

  // TODO: Add unit tests
  async getAllTransactions(startDate: string, endDate: string): Promise<Transaction[]> {
    throw new Error("Not implemented!");
  }

  // TODO: Add unit tests
  async getTransactionStats(): Promise<TransactionStatsDTO> {
    throw new Error("Not implemented!");
  }

  async addNobaAdmin(nobaAdmin: Admin): Promise<Admin> {
    try {
      const adminCreateInput = this.adminRepoMapper.toAdminCreateInput(nobaAdmin);
      const adminProps = await this.prismaService.admin.create({ data: adminCreateInput });
      return Admin.createAdmin(adminProps);
    } catch (e) {
      throw new BadRequestError({ message: `Failed to create NobaAdmin. Reason: ${e.message}` });
    }
  }

  async getNobaAdminByEmail(email: string): Promise<Admin> {
    try {
      const adminProps = await this.prismaService.admin.findUnique({ where: { email: email } });
      if (!adminProps) return undefined;
      return this.adminMapper.toDomain(adminProps);
    } catch (e) {
      return undefined;
    }
  }

  async updateNobaAdmin(id: string, adminProps: Partial<AdminProps>): Promise<Admin> {
    try {
      const updateInput = this.adminRepoMapper.toAdminUpdateInput(adminProps);
      const updatedAdminProps = await this.prismaService.admin.update({ where: { id: id }, data: updateInput });
      return this.adminMapper.toDomain(updatedAdminProps);
    } catch (e) {
      throw new BadRequestError({ message: `Failed to update noba admin. Reason: ${e.message}` });
    }
  }

  async deleteNobaAdmin(id: string): Promise<void> {
    try {
      await this.prismaService.admin.delete({ where: { id: id } });
    } catch (e) {
      throw new BadRequestError({ message: `Noba admin with id ${id} not found!` });
    }
  }

  async getNobaAdminById(id: string): Promise<Admin> {
    try {
      const adminProps = await this.prismaService.admin.findUnique({ where: { id: id } });
      if (!adminProps) return undefined;

      return Admin.createAdmin(adminProps);
    } catch (e) {
      return undefined;
    }
  }
}
