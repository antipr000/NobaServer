import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IAdminRepo } from "./repos/transactions/sql.admin.repo";
import { TransactionStatsDTO } from "./dto/TransactionStats";
import { ACCOUNT_BALANCE_TYPES, Admin, AllRoles, isValidRole } from "./domain/Admin";
import { PaymentService } from "../psp/payment.service";
import { AccountBalanceDTO } from "./dto/AccountBalanceDTO";
import { AdminPSPMapper } from "./mappers/admin.psp";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { ConsumerService } from "../consumer/consumer.service";
import { ConsumerSearchDTO } from "../consumer/dto/consumer.search.dto";
import { ConsumerMapper } from "../consumer/mappers/ConsumerMapper";
import { CircleService } from "../psp/circle.service";
import { EmployeeService } from "../employee/employee.service";
import { Employee } from "../employee/domain/Employee";
import { ConsumerEmployeeDetailsDTO, ConsumerInternalDTO } from "../consumer/dto/ConsumerInternalDTO";

@Injectable()
export class AdminService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly paymentService: PaymentService;

  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject()
  private readonly consumerMapper: ConsumerMapper;

  @Inject()
  private readonly circleService: CircleService;

  @Inject()
  private readonly employeeService: EmployeeService;

  @Inject("AdminTransactionRepo")
  private readonly adminRepo: IAdminRepo;

  private readonly adminPSPMapper: AdminPSPMapper;

  constructor() {
    this.adminPSPMapper = new AdminPSPMapper();
  }

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
    const admin: Admin | undefined = await this.adminRepo.getNobaAdminByEmail(email);
    if (admin === undefined) {
      throw new NotFoundException(`Admin with email '${email}' is not found.`);
    }
    return admin;
  }

  async getAdminById(id: string): Promise<Admin> {
    return this.adminRepo.getNobaAdminById(id);
  }

  async getBalanceForAccounts(accountType: ACCOUNT_BALANCE_TYPES, accountIDs: string[]): Promise<AccountBalanceDTO[]> {
    if (!accountType) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Invalid account type",
      });
    }

    const accountBalancesPromises: Promise<AccountBalanceDTO>[] = accountIDs.map(async accountID => {
      const bankName = this.adminPSPMapper.accountTypeToBankName(accountType);
      const accountBalance = await this.paymentService.getBalance(bankName, accountID);
      return await this.adminPSPMapper.balanceDTOToAccountBalanceDTO(accountID, accountBalance);
    });

    const accountBalances = await Promise.all(accountBalancesPromises);

    return accountBalances;
  }

  async findConsumersFullDetails(filter: ConsumerSearchDTO): Promise<ConsumerInternalDTO[]> {
    const consumers = await this.consumerService.findConsumers(filter);
    const internalConsumers = consumers.map(consumer => this.consumerMapper.toConsumerInternalDTO(consumer));

    // For each consumer, add wallet and employee details
    await Promise.all(
      internalConsumers.map(async consumer => {
        consumer.walletDetails = [
          {
            walletProvider: "Circle",
            walletID: await this.circleService.getOrCreateWallet(consumer.id),
          },
        ];

        consumer.employeeDetails = await Promise.all(
          (
            await this.employeeService.getEmployeesForConsumerID(consumer.id, true)
          ).map(employee => this.toConsumerEmployeeDetailsDTO(employee)),
        );
      }),
    );

    return internalConsumers;
  }

  toConsumerEmployeeDetailsDTO(employee: Employee): ConsumerEmployeeDetailsDTO {
    return {
      employeeID: employee.id,
      allocationAmount: employee.allocationAmount,
      allocationCurrency: employee.allocationCurrency,
      createdTimestamp: employee.createdTimestamp,
      updatedTimestamp: employee.updatedTimestamp,
      employerID: employee.employerID,
      employerName: employee.employer.name,
    };
  }
}
