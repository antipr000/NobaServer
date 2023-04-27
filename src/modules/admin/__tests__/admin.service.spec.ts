import { TestingModule, Test } from "@nestjs/testing";
import { anything, capture, instance, when } from "ts-mockito";
import { AdminService } from "../admin.service";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IAdminRepo } from "../repos/transactions/sql.admin.repo";
import { ACCOUNT_BALANCE_TYPES, Admin } from "../domain/Admin";
import { AdminMapper } from "../mappers/AdminMapper";
import { getTestWinstonModule } from "../../../../src/core/utils/WinstonModule";
import { getMockAdminRepoWithDefaults } from "../mocks/MockAdminRepo";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { PaymentService } from "../../../modules/psp/payment.service";
import { getMockPaymentServiceWithDefaults } from "../../../modules/psp/mocks/mock.payment.service";
import { ServiceErrorCode } from "../../../core/exception/service.exception";
import { BankName } from "../../../modules/psp/domain/BankFactoryTypes";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { ConsumerMapper } from "../../../modules/consumer/mappers/ConsumerMapper";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { ConsumerSearchDTO } from "../../../modules/consumer/dto/consumer.search.dto";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { getMockConsumerMapperWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.mapper";
import { getMockCircleServiceWithDefaults } from "../../circle/public/mocks/mock.circle.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";
import { Employee, EmployeeStatus } from "../../../modules/employee/domain/Employee";
import { DocumentVerificationStatus, KYCProvider, KYCStatus } from "@prisma/client";
import { AdminUpdateConsumerRequestDTO } from "../dto/AdminUpdateConsumerRequestDTO";
import { ConsumerInternalDTO } from "../../../modules/consumer/dto/ConsumerInternalDTO";
import { Gender } from "../../../modules/consumer/domain/ExternalStates";
import { TransactionService } from "../../../modules/transaction/transaction.service";
import { CircleService } from "../../../modules/circle/public/circle.service";

describe("AdminService", () => {
  jest.setTimeout(5000);

  let adminRepo: IAdminRepo;
  let adminService: AdminService;
  let paymentService: PaymentService;
  let consumerService: ConsumerService;
  let consumerMapper: ConsumerMapper;
  let circleService: CircleService;
  let employeeService: EmployeeService;

  beforeEach(async () => {
    adminRepo = getMockAdminRepoWithDefaults();
    paymentService = getMockPaymentServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    consumerMapper = getMockConsumerMapperWithDefaults();
    circleService = getMockCircleServiceWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      providers: [
        AdminService,
        {
          provide: "AdminTransactionRepo",
          useFactory: () => instance(adminRepo),
        },
        {
          provide: PaymentService,
          useFactory: () => instance(paymentService),
        },
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: ConsumerMapper,
          useFactory: () => instance(consumerMapper),
        },
        {
          provide: CircleService,
          useFactory: () => instance(circleService),
        },
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        {
          provide: TransactionService,
          useFactory: () => instance(TransactionService),
        },
        AdminMapper,
      ],
    }).compile();

    adminService = app.get<AdminService>(AdminService);
  });

  describe("addNobaAdmin", () => {
    it("should return 'undefined' if email already exists", async () => {
      const EXISTING_ADMIN_EMAIL = "abcd@noba.com";
      const existingNobaAdmin = Admin.createAdmin({
        id: "1111111111",
        name: "Admin",
        email: EXISTING_ADMIN_EMAIL,
        role: "INTERMEDIATE",
      });

      when(adminRepo.getNobaAdminByEmail(EXISTING_ADMIN_EMAIL)).thenResolve(existingNobaAdmin);

      const result = await adminService.addNobaAdmin(existingNobaAdmin);
      expect(result).toBeUndefined();
    });

    it("should creates a new Admin with the given email & role", async () => {
      const NEW_ADMIN_EMAIL = "xyz@noba.com";
      const newNobaAdmin = Admin.createAdmin({
        id: "1111111112",
        name: "Admin 2",
        email: NEW_ADMIN_EMAIL,
        role: "INTERMEDIATE",
      });

      when(adminRepo.getNobaAdminByEmail(NEW_ADMIN_EMAIL)).thenResolve(undefined);
      when(adminRepo.addNobaAdmin(newNobaAdmin)).thenResolve(newNobaAdmin);

      const result = await adminService.addNobaAdmin(newNobaAdmin);
      expect(result).toStrictEqual(newNobaAdmin);
    });
  });

  describe("getAllNobaAdmins", () => {
    it("should return all noba admins", async () => {
      const nobaAdmins = [
        Admin.createAdmin({
          id: "1111111111",
          name: "Admin",
          email: "fake+admin@noba.com",
        }),
      ];

      when(adminRepo.getAllNobaAdmins()).thenResolve(nobaAdmins);

      const result = await adminService.getAllNobaAdmins();
      expect(result).toStrictEqual(nobaAdmins);
    });
  });

  describe("updateNobaAdmin", () => {
    it("should throw 'BadRequestException' if 'role' is invalid", async () => {
      const invalidRole = "INVALID_ROLE";

      try {
        await adminService.updateNobaAdmin("1111111111", invalidRole, "new name");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it("should throw 'BadRequestException' if 'name' is empty", async () => {
      const validRole = "BASIC";

      try {
        await adminService.updateNobaAdmin("1111111111", validRole, "");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it("should throw 'BadRequestException' if 'name' is null", async () => {
      const validRole = "BASIC";

      try {
        await adminService.updateNobaAdmin("1111111111", validRole, null);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it("should throw 'BadRequestException' if 'name' is undefined", async () => {
      const validRole = "BASIC";

      try {
        await adminService.updateNobaAdmin("1111111111", validRole, undefined);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it("should throw 'NotFoundException' if admin with given email doesn't exist", async () => {
      const INVALIDid = "2222222222";

      when(adminRepo.getNobaAdminById(INVALIDid)).thenResolve(undefined);

      try {
        await adminService.updateNobaAdmin(INVALIDid, "BASIC", "new name");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it("should successfully update the role and name of the NobaAdmin", async () => {
      const ADMINid = "1111111111";
      const ADMIN_EMAIL = "admin@noba.com";

      const CHANGED_NAME = "New Admin Name";
      const CHANGED_ROLE = "INTERMEDIATE";

      const CURRENT_ROLE = "BASIC";
      const CURRENT_NAME = "Admin Name";

      const nobaAdmin: Admin = Admin.createAdmin({
        id: ADMINid,
        email: ADMIN_EMAIL,
        name: CURRENT_NAME,
        role: CURRENT_ROLE,
      });
      const updatedNobaAdmin = Admin.createAdmin({
        id: ADMINid,
        email: ADMIN_EMAIL,
        name: CHANGED_NAME,
        role: CHANGED_ROLE,
      });

      when(adminRepo.getNobaAdminById(ADMINid)).thenResolve(nobaAdmin);
      when(adminRepo.updateNobaAdmin(ADMINid, anything())).thenResolve(updatedNobaAdmin);

      const result = await adminService.updateNobaAdmin(ADMINid, CHANGED_ROLE, CHANGED_NAME);
      const updatedAdminProps = capture(adminRepo.updateNobaAdmin).last()[1];

      expect(result).toBe(updatedNobaAdmin);
      expect(updatedAdminProps.role).toEqual(CHANGED_ROLE);
      expect(updatedAdminProps.name).toEqual(CHANGED_NAME);
    });
  });

  describe("deleteNobaAdmin", () => {
    it("should throw 'NotFoundException' if user with given ID doesn't exists", async () => {
      const adminId = "1111111111";
      when(adminRepo.deleteNobaAdmin(adminId)).thenReject(new BadRequestError({ message: "Failed to update" }));
      expect(async () => await adminService.deleteNobaAdmin(adminId)).rejects.toThrow(BadRequestError);
    });

    it("should delete the admin with given ID successfully", async () => {
      const adminId = "1111111111";
      when(adminRepo.deleteNobaAdmin(adminId)).thenResolve();

      const result = await adminService.deleteNobaAdmin(adminId);

      expect(result).toBe(adminId);
    });
  });

  describe("getAdminByEmail", () => {
    it("should throw 'NotFoundException' if email doesn't exist", async () => {
      const NON_EXISTING_ADMIN_EMAIL = "abcd@noba.com";

      when(adminRepo.getNobaAdminByEmail(NON_EXISTING_ADMIN_EMAIL)).thenReject(new NotFoundException());

      try {
        await adminService.getAdminByEmail(NON_EXISTING_ADMIN_EMAIL);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it("should successfully return an Admin with given email", async () => {
      const EXISTING_ADMIN_EMAIL = "abcd@noba.com";
      const existingNobaAdmin = Admin.createAdmin({
        id: "1111111111",
        name: "Admin",
        email: EXISTING_ADMIN_EMAIL,
        role: "INTERMEDIATE",
      });

      when(adminRepo.getNobaAdminByEmail(EXISTING_ADMIN_EMAIL)).thenResolve(existingNobaAdmin);

      const result = await adminService.getAdminByEmail(EXISTING_ADMIN_EMAIL);
      expect(result).toEqual(existingNobaAdmin);
    });
  });

  describe("getAdminById", () => {
    it("should throw 'NotFoundException' if ID doesn't exist", async () => {
      const NON_EXISTING_ADMINid = "1111111111";

      when(adminRepo.getNobaAdminById(NON_EXISTING_ADMINid)).thenReject(new NotFoundException());

      try {
        await adminService.getAdminById(NON_EXISTING_ADMINid);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it("should successfully return an Admin with given ID", async () => {
      const EXISTING_ADMINid = "1111111111";
      const existingNobaAdmin = Admin.createAdmin({
        id: EXISTING_ADMINid,
        name: "Admin",
        email: "abcd@noba.com",
        role: "INTERMEDIATE",
      });

      when(adminRepo.getNobaAdminById(EXISTING_ADMINid)).thenResolve(existingNobaAdmin);

      const result = await adminService.getAdminById(EXISTING_ADMINid);
      expect(result).toEqual(existingNobaAdmin);
    });
  });

  describe("getBalanceForAccounts", () => {
    it("should get mono balances", async () => {
      const monoAccountID1 = "mono-account-id-1";
      const monoAccountID2 = "mono-account-id-2";
      when(paymentService.getBalance(BankName.MONO, monoAccountID1)).thenResolve({
        currency: "COP",
        balance: 1.23,
      });
      when(paymentService.getBalance(BankName.MONO, monoAccountID2)).thenResolve({
        currency: "COP",
        balance: 19999,
      });
      const balances = await adminService.getBalanceForAccounts(ACCOUNT_BALANCE_TYPES.MONO, [
        monoAccountID1,
        monoAccountID2,
      ]);
      expect(balances).toEqual([
        {
          accountID: monoAccountID1,
          balance: 1.23,
          currency: "COP",
        },
        {
          accountID: monoAccountID2,
          balance: 19999,
          currency: "COP",
        },
      ]);
    });

    it("should get circle balances", async () => {
      const circleAccountID1 = "circle-account-id-1";
      const circleAccountID2 = "circle-account-id-2";
      when(paymentService.getBalance(BankName.CIRCLE, circleAccountID1)).thenResolve({
        currency: "USD",
        balance: 100.01,
      });
      when(paymentService.getBalance(BankName.CIRCLE, circleAccountID2)).thenResolve({
        currency: "USD",
        balance: 10,
      });
      const balances = await adminService.getBalanceForAccounts(ACCOUNT_BALANCE_TYPES.CIRCLE, [
        circleAccountID1,
        circleAccountID2,
      ]);
      expect(balances).toEqual([
        {
          accountID: circleAccountID1,
          balance: 100.01,
          currency: "USD",
        },
        {
          accountID: circleAccountID2,
          balance: 10,
          currency: "USD",
        },
      ]);
    });

    it("should return no balances when empty account IDs", async () => {
      const balances = await adminService.getBalanceForAccounts(ACCOUNT_BALANCE_TYPES.CIRCLE, []);
      expect(balances).toEqual([]);
    });

    it("should throw invalid account balance type when balance type null", async () => {
      expect(adminService.getBalanceForAccounts(null, [])).rejects.toThrowServiceException(
        ServiceErrorCode.SEMANTIC_VALIDATION,
      );
    });
  });

  describe("findConsumersFullDetails", () => {
    it("should find consumers and add wallet details and employee details", async () => {
      const consumer1 = Consumer.createConsumer({
        id: "1111111111",
        firstName: "Rosie",
        lastName: "Noba",
        email: "rosie@noba.com",
        gender: "Male",
      });
      const consumer2 = Consumer.createConsumer({
        id: "22222222222",
        firstName: "Rosie",
        lastName: "Noba",
        email: "rosie2@noba.com",
        gender: "Female",
      });

      const filterCriteria: ConsumerSearchDTO = {
        name: "Rosie",
      };

      const employee1Details: Employee = {
        id: "employee-id-1",
        allocationAmount: 100,
        allocationCurrency: "USD" as any,
        employerID: "employer-id-1",
        consumerID: consumer1.props.id,
        status: EmployeeStatus.LINKED,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        employer: {
          id: "employer-id-1",
          name: "Employer 1",
          bubbleID: "bubble-id-1",
          logoURI: "logo-uri-1",
          locale: "en_us",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          leadDays: 1,
          referralID: "referral-id-1",
          payrollDates: [],
        },
      };

      const employee2Details: Employee = {
        id: "employee-id-2",
        allocationAmount: 200,
        allocationCurrency: "USD" as any,
        employerID: "employer-id-2",
        consumerID: consumer2.props.id,
        status: EmployeeStatus.LINKED,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        employer: {
          id: "employer-id-2",
          name: "Employer 2",
          bubbleID: "bubble-id-2",
          logoURI: "logo-uri-2",
          locale: "en_us",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          leadDays: 2,
          referralID: "referral-id-2",
          payrollDates: [],
        },
      };

      when(consumerService.adminFindConsumers(filterCriteria)).thenResolve([consumer1, consumer2]);
      when(consumerMapper.toConsumerInternalDTO(consumer1)).thenReturn({ ...consumer1.props, gender: Gender.MALE });
      when(consumerMapper.toConsumerInternalDTO(consumer2)).thenReturn({ ...consumer2.props, gender: Gender.FEMALE });
      when(circleService.getOrCreateWallet(consumer1.props.id)).thenResolve("wallet-id-1");
      when(circleService.getOrCreateWallet(consumer2.props.id)).thenResolve("wallet-id-2");
      when(employeeService.getEmployeesForConsumerID(consumer1.props.id, true)).thenResolve([employee1Details]);
      when(employeeService.getEmployeesForConsumerID(consumer2.props.id, true)).thenResolve([employee2Details]);

      const foundConsumers = await adminService.findConsumersFullDetails(filterCriteria);
      expect(foundConsumers).toStrictEqual([
        {
          id: consumer1.props.id,
          firstName: consumer1.props.firstName,
          lastName: consumer1.props.lastName,
          email: consumer1.props.email,
          gender: Gender.MALE,
          walletDetails: [
            {
              walletProvider: "Circle",
              walletID: "wallet-id-1",
            },
          ],
          employeeDetails: [
            {
              employeeID: employee1Details.id,
              allocationAmount: employee1Details.allocationAmount,
              allocationCurrency: employee1Details.allocationCurrency,
              createdTimestamp: employee1Details.createdTimestamp,
              updatedTimestamp: employee1Details.updatedTimestamp,
              employerID: employee1Details.employerID,
              employerName: employee1Details.employer.name,
            },
          ],
        },
        {
          id: consumer2.props.id,
          firstName: consumer2.props.firstName,
          lastName: consumer2.props.lastName,
          email: consumer2.props.email,
          gender: Gender.FEMALE,
          walletDetails: [
            {
              walletProvider: "Circle",
              walletID: "wallet-id-2",
            },
          ],
          employeeDetails: [
            {
              employeeID: employee2Details.id,
              allocationAmount: employee2Details.allocationAmount,
              allocationCurrency: employee2Details.allocationCurrency,
              createdTimestamp: employee2Details.createdTimestamp,
              updatedTimestamp: employee2Details.updatedTimestamp,
              employerID: employee2Details.employerID,
              employerName: employee2Details.employer.name,
            },
          ],
        },
      ]);
    });
  });

  describe("updateConsumer", () => {
    it("should update a consumer with new values, ignoring unchanged values, and emptying values that got cleared", async () => {
      const consumer1 = Consumer.createConsumer({
        id: "1111111111",
        firstName: "Rosie",
        lastName: "Noba",
        handle: "rosie-noba",
        email: "rosie@noba.com",
        gender: "Male",
        phone: "+1234567890",
        referralCode: "rosie-referral-code",
        referredByID: "referred-by-1",
        address: {
          countryCode: "US",
        },
      });

      const newFirstname = "Rosalie";
      const newReferredByID = "";

      const updateRequest: AdminUpdateConsumerRequestDTO = {
        firstName: newFirstname, // Updated first name
        lastName: consumer1.props.lastName, // Same old last name
        referredByID: newReferredByID, // Empty referred by ID
      };

      const updatedConsumer1: Consumer = Consumer.createConsumer({
        ...consumer1.props,
        firstName: newFirstname,
        referredByID: null, // Empty gets converted to null
      });

      const consumerInternalDTO: ConsumerInternalDTO = {
        ...updatedConsumer1.props,
        gender: Gender.MALE,
        address: {
          ...(consumer1.props.address as any),
        },
        verificationData: {
          ...(consumer1.props.verificationData as any),
        },
      };

      when(consumerService.getConsumer(consumer1.props.id)).thenResolve(consumer1);
      when(consumerService.updateConsumer(anything(), true)).thenResolve(updatedConsumer1);

      when(consumerMapper.toConsumerInternalDTO(anything())).thenReturn(consumerInternalDTO);
      when(circleService.getOrCreateWallet(consumer1.props.id)).thenResolve("wallet-id-1");
      when(employeeService.getEmployeesForConsumerID(consumer1.props.id, true)).thenResolve([]);

      const updatedConsumer = await adminService.updateConsumer(consumer1.props.id, updateRequest);

      const [updateConsumerParams] = capture(consumerService.updateConsumer).last();
      expect(updateConsumerParams).toStrictEqual({
        id: consumer1.props.id,
        firstName: updatedConsumer1.props.firstName,
        referredByID: updatedConsumer1.props.referredByID,
      });

      expect(updatedConsumer).toEqual({
        ...updatedConsumer1.props,
        verificationData: {},
        employeeDetails: [],
        walletDetails: [
          {
            walletProvider: "Circle",
            walletID: "wallet-id-1",
          },
        ],
      });
    });

    it("should update every allowable field in consumer", async () => {
      const consumer1 = Consumer.createConsumer({
        id: "1111111111",
        firstName: "Rosie",
        lastName: "Noba",
        email: "rosie@noba.com",
        phone: "+1234567890",
        dateOfBirth: "1990-01-01",
        handle: "rosie-noba",
        gender: "Male",
        address: {
          streetLine1: "123 Main St",
          streetLine2: "Apt 1",
          city: "San Francisco",
          regionCode: "CA",
          postalCode: "94105",
          countryCode: "US",
        },
        isLocked: false,
        isDisabled: false,
        referralCode: "rosie-referral-code",
        referredByID: "referred-by-1",
        verificationData: {
          provider: KYCProvider.SARDINE,
          kycCheckStatus: KYCStatus.PENDING,
          documentVerificationStatus: DocumentVerificationStatus.PENDING,
        },
      });

      const updateRequest: AdminUpdateConsumerRequestDTO = {
        firstName: "Rosie-Update",
        lastName: "Noba-Update",
        email: "rosie-update@noba.com",
        phone: "+12345678901",
        dateOfBirth: "1990-01-02",
        handle: "rosie-noba-update",
        gender: Gender.FEMALE,
        address: {
          streetLine1: "123 Main St-update",
          streetLine2: "Apt 1 Update",
          city: "Miami",
          regionCode: "FL",
          postalCode: "23927",
          countryCode: "CO",
        },
        isLocked: true,
        isDisabled: true,
        referredByID: "referred-by-1-update",
        verificationData: {
          provider: "Updated" as any,
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
        },
      };

      const updatedConsumer1: Consumer = Consumer.createConsumer({
        ...consumer1.props,
        firstName: "Rosie-Update",
        lastName: "Noba-Update",
        email: "rosie-update@noba.com",
        phone: "+12345678901",
        dateOfBirth: "1990-01-02",
        handle: "rosie-noba-update",
        gender: Gender.FEMALE,
        address: {
          streetLine1: "123 Main St-update",
          streetLine2: "Apt 1 Update",
          city: "Miami",
          regionCode: "FL",
          postalCode: "23927",
          countryCode: "CO",
        },
        isLocked: true,
        isDisabled: true,
        referredByID: "referred-by-1-update",
        verificationData: {
          provider: "Updated" as any,
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
        },
      });

      const consumerInternalDTO: ConsumerInternalDTO = {
        ...updatedConsumer1.props,
        gender: Gender.FEMALE,
        address: {
          ...updatedConsumer1.props.address,
        },
        verificationData: {
          ...updatedConsumer1.props.verificationData,
        },
      };

      when(consumerService.getConsumer(consumer1.props.id)).thenResolve(consumer1);
      when(consumerService.updateConsumer(anything(), true)).thenResolve(updatedConsumer1);

      when(consumerMapper.toConsumerInternalDTO(anything())).thenReturn(consumerInternalDTO);
      when(circleService.getOrCreateWallet(consumer1.props.id)).thenResolve("wallet-id-1");
      when(employeeService.getEmployeesForConsumerID(consumer1.props.id, true)).thenResolve([]);

      const updatedConsumer = await adminService.updateConsumer(consumer1.props.id, updateRequest);

      const [updateConsumerParams] = capture(consumerService.updateConsumer).last();
      expect(updateConsumerParams).toStrictEqual({
        id: updatedConsumer1.props.id,
        ...updateRequest,
      });
      expect(updatedConsumer).toStrictEqual({
        ...updatedConsumer1.props,
        employeeDetails: [],
        walletDetails: [
          {
            walletProvider: "Circle",
            walletID: "wallet-id-1",
          },
        ],
      });
    });
  });
});
