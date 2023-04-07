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
import { EmployeeService } from "../employee/employee.service";
import { Employee } from "../employee/domain/Employee";
import { ConsumerEmployeeDetailsDTO, ConsumerInternalDTO } from "../consumer/dto/ConsumerInternalDTO";
import { AdminUpdateConsumerRequestDTO } from "./dto/AdminUpdateConsumerRequestDTO";
import { Consumer } from "../consumer/domain/Consumer";
import { TransactionService } from "../transaction/transaction.service";
import { TransactionFilterOptionsDTO } from "../transaction/dto/TransactionFilterOptionsDTO";
import { Transaction } from "../transaction/domain/Transaction";
import { PaginatedResult } from "../../core/infra/PaginationTypes";
import { TransactionEvent } from "../transaction/domain/TransactionEvent";
import { CircleService } from "../circle/public/circle.service";

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

  @Inject()
  private readonly transactionService: TransactionService;

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

  async getAllNobaAdmins(): Promise<Admin[]> {
    return this.adminRepo.getAllNobaAdmins();
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
    return Promise.all(consumers.map(async consumer => this.decorateConsumer(consumer)));
  }

  async decorateConsumer(consumer: Consumer): Promise<ConsumerInternalDTO> {
    // Convert to internal DTO
    const internalConsumer = this.consumerMapper.toConsumerInternalDTO(consumer);

    // Decorate with wallet details
    internalConsumer.walletDetails = [
      {
        walletProvider: "Circle",
        walletID: await this.circleService.getOrCreateWallet(consumer.props.id),
      },
    ];

    // Decorate with employee details
    internalConsumer.employeeDetails = await Promise.all(
      (
        await this.employeeService.getEmployeesForConsumerID(consumer.props.id, true)
      ).map(employee => this.toConsumerEmployeeDetailsDTO(employee)),
    );

    return internalConsumer;
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

  async updateConsumer(consumerID: string, updateDetails: AdminUpdateConsumerRequestDTO): Promise<ConsumerInternalDTO> {
    const consumer = await this.consumerService.getConsumer(consumerID);
    const updateConsumerPayload = {
      id: consumerID,
      ...(this.shouldUpdateField(updateDetails.firstName, consumer.props.firstName) && {
        firstName: this.cleanValue(updateDetails.firstName),
      }),
      ...(this.shouldUpdateField(updateDetails.lastName, consumer.props.lastName) && {
        lastName: this.cleanValue(updateDetails.lastName),
      }),
      ...(this.shouldUpdateField(updateDetails.email, consumer.props.email) && {
        email: this.cleanValue(updateDetails.email),
      }),
      ...(this.shouldUpdateField(updateDetails.phone, consumer.props.phone) && {
        phone: this.cleanValue(updateDetails.phone),
      }),
      ...(this.shouldUpdateField(updateDetails.gender, consumer.props.gender) && {
        gender: this.cleanValue(updateDetails.gender),
      }),
      ...(this.shouldUpdateField(updateDetails.dateOfBirth, consumer.props.dateOfBirth) && {
        dateOfBirth: this.cleanValue(updateDetails.dateOfBirth),
      }),
      ...(this.shouldUpdateField(updateDetails.handle, consumer.props.handle) && {
        handle: this.cleanValue(updateDetails.handle),
      }),
      ...(this.shouldUpdateField(updateDetails.isLocked, consumer.props.isLocked) && {
        isLocked: this.cleanValue(updateDetails.isLocked),
      }),
      ...(this.shouldUpdateField(updateDetails.isDisabled, consumer.props.isDisabled) && {
        isDisabled: this.cleanValue(updateDetails.isDisabled),
      }),
      ...(this.shouldUpdateField(updateDetails.referredByID, consumer.props.referredByID) && {
        referredByID: this.cleanValue(updateDetails.referredByID),
      }),
      ...(updateDetails.address && {
        address: {
          ...(this.shouldUpdateField(updateDetails.address.streetLine1, consumer.props.address?.streetLine1) && {
            streetLine1: this.cleanValue(updateDetails.address.streetLine1),
          }),
          ...(this.shouldUpdateField(updateDetails.address.streetLine2, consumer.props.address?.streetLine2) && {
            streetLine2: this.cleanValue(updateDetails.address.streetLine2),
          }),
          // provider is required, so always update even if unchanged
          countryCode: this.cleanValue(updateDetails.address.countryCode),
          ...(this.shouldUpdateField(updateDetails.address.city, consumer.props.address?.city) && {
            city: this.cleanValue(updateDetails.address.city),
          }),
          ...(this.shouldUpdateField(updateDetails.address.regionCode, consumer.props.address?.regionCode) && {
            regionCode: this.cleanValue(updateDetails.address.regionCode),
          }),
          ...(this.shouldUpdateField(updateDetails.address.postalCode, consumer.props.address?.postalCode) && {
            postalCode: this.cleanValue(updateDetails.address.postalCode),
          }),
        },
      }),
      ...(updateDetails.verificationData && {
        verificationData: {
          // provider is required, so always update even if unchanged
          provider: this.cleanValue(updateDetails.verificationData.provider),
          ...(this.shouldUpdateField(
            updateDetails.verificationData.kycCheckStatus,
            consumer.props.verificationData?.kycCheckStatus,
          ) && { kycCheckStatus: this.cleanValue(updateDetails.verificationData.kycCheckStatus) }),
          ...(this.shouldUpdateField(
            updateDetails.verificationData.documentVerificationStatus,
            consumer.props.verificationData?.documentVerificationStatus,
          ) && {
            documentVerificationStatus: this.cleanValue(updateDetails.verificationData.documentVerificationStatus),
          }),
        },
      }),
    };
    await this.consumerService.updateConsumer(updateConsumerPayload);
    const updatedConsumer = await this.consumerService.getConsumer(consumerID);
    return this.decorateConsumer(updatedConsumer);
  }

  async getFilteredTransactions(filter: TransactionFilterOptionsDTO): Promise<PaginatedResult<Transaction>> {
    return this.transactionService.getFilteredTransactions(filter);
  }

  async getTransactionByTransactionRef(transactionRef: string): Promise<Transaction> {
    return this.transactionService.getTransactionByTransactionRef(transactionRef);
  }

  async getTransactionEvents(transactionID: string, includeInternalEvents: boolean): Promise<TransactionEvent[]> {
    return this.transactionService.getTransactionEvents(transactionID, includeInternalEvents);
  }

  private shouldUpdateField(newValue: any, oldValue: any): boolean {
    // If it's undefined, then it's not part of what we want to update
    if (newValue === undefined) {
      return false;
    }

    return this.cleanValue(newValue) !== this.cleanValue(oldValue);
  }

  private cleanValue(value: any): any {
    if (value === undefined || value === null) {
      return value;
    }

    if (typeof value === "string") {
      // Convert empty strings to null
      return value.trim() === "" ? null : value.trim();
    } else {
      return value;
    }
  }
}
