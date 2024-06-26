import { TestingModule, Test } from "@nestjs/testing";
import { anything, capture, deepEqual, instance, when } from "ts-mockito";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { AdminService } from "../admin.service";
import { ACCOUNT_BALANCE_TYPES, Admin, NOBA_ADMIN_ROLE_TYPES } from "../domain/Admin";
import { AdminController } from "../admin.controller";
import { AdminMapper } from "../mappers/AdminMapper";
import { NobaAdminDTO } from "../dto/NobaAdminDTO";
import { ConflictException, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { getMockAdminServiceWithDefaults } from "../mocks/MockAdminService";
import { UpdateNobaAdminDTO } from "../dto/UpdateNobaAdminDTO";
import { DeleteNobaAdminDTO } from "../dto/DeleteNobaAdminDTO";
import { Consumer, ConsumerProps } from "../../consumer/domain/Consumer";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { KYCStatus, DocumentVerificationStatus, KYCProvider } from "@prisma/client";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { getMockTransactionServiceWithDefaults } from "../../../modules/transaction/mocks/mock.transaction.service";
import { ConsumerMapper } from "../../../modules/consumer/mappers/ConsumerMapper";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";
import { EmployerService } from "../../../modules/employer/employer.service";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { getRandomPayroll } from "../../../modules/employer/test_utils/payroll.test.utils";
import { Transaction, TransactionStatus, WorkflowName } from "../../../modules/transaction/domain/Transaction";
import { v4 } from "uuid";
import { FeeType } from "../../../modules/transaction/domain/TransactionFee";
import { TransactionFilterOptionsDTO } from "../../../modules/transaction/dto/TransactionFilterOptionsDTO";
import {
  TransactionMappingService,
  TRANSACTION_MAPPING_SERVICE_PROVIDER,
} from "../../../modules/transaction/mapper/transaction.mapper.service";
import { MonoService } from "../../mono/public/mono.service";
import { IncludeEventTypes, TransactionEventDTO } from "../../../modules/transaction/dto/TransactionEventDTO";
import { TransactionDTO } from "../../../modules/transaction/dto/TransactionDTO";
import { Utils } from "../../../core/utils/Utils";
import { MonoTransaction, MonoTransactionState, MonoTransactionType } from "../../mono/domain/Mono";
import { TransactionEvent } from "../../../modules/transaction/domain/TransactionEvent";
import { getMockMonoServiceWithDefaults } from "../../mono/public/mocks/mock.mono.service";
import { TransactionService } from "../../../modules/transaction/transaction.service";
import { getMockTransactionMapperServiceWithDefaults } from "../../../modules/transaction/mocks/mock.transaction.mapper.service";
import { Gender } from "../../../modules/consumer/domain/ExternalStates";
import { ExchangeRateService } from "../../../modules/exchangerate/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../modules/exchangerate/mocks/mock.exchangerate.service";
import { ExchangeRateDTO } from "../../../modules/exchangerate/dto/exchangerate.dto";
import { ConsumerWorkflowName } from "../../../infra/temporal/workflow";
import { InitiateTransactionDTO } from "../../../modules/transaction/dto/CreateTransactionDTO";
import { Currency } from "../../../modules/transaction/domain/TransactionTypes";

const EXISTING_ADMIN_EMAIL = "abc@noba.com";
const NEW_ADMIN_EMAIL = "xyz@noba.com";
const LOGGED_IN_ADMIN_EMAIL = "authenticated@noba.com";

const getRandomTransaction = (consumerID: string, isCreditTransaction = false): Transaction => {
  const transaction: Transaction = {
    transactionRef: v4(),
    exchangeRate: 1,
    status: TransactionStatus.INITIATED,
    workflowName: WorkflowName.WALLET_DEPOSIT,
    id: v4(),
    sessionKey: v4(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    transactionFees: [
      {
        amount: 10,
        currency: "USD",
        type: FeeType.NOBA,
        id: v4(),
        timestamp: new Date(),
      },
    ],
  };

  if (isCreditTransaction) {
    transaction.creditAmount = 100;
    transaction.creditCurrency = "USD";
    transaction.creditConsumerID = consumerID;
  } else {
    transaction.debitAmount = 100;
    transaction.debitCurrency = "USD";
    transaction.debitConsumerID = consumerID;
  }
  return transaction;
};

const getRandomConsumer = (consumerID: string): Consumer => {
  const email = `${v4()}_${new Date().valueOf()}@noba.com`;
  const props: Partial<ConsumerProps> = {
    id: consumerID,
    firstName: "Noba",
    lastName: "lastName",
    email: email,
    displayEmail: email.toUpperCase(),
    referralCode: Utils.getAlphaNanoID(15),
    phone: `+1${Math.floor(Math.random() * 1000000000)}`,
  };
  return Consumer.createConsumer(props);
};

describe("AdminController", () => {
  jest.setTimeout(2000);

  let adminController: AdminController;
  let consumerMapper: ConsumerMapper;

  let mockAdminService: AdminService;
  let mockConsumerService: ConsumerService;
  let mockExchangeRateService: ExchangeRateService;
  let mockEmployeeService: EmployeeService;
  let mockEmployerService: EmployerService;
  let mockTransactionService: TransactionService;
  let mockTransactionMappingService: TransactionMappingService;
  let mockMonoService: MonoService;

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };

    mockAdminService = getMockAdminServiceWithDefaults();
    mockConsumerService = getMockConsumerServiceWithDefaults();
    mockExchangeRateService = getMockExchangeRateServiceWithDefaults();
    mockEmployeeService = getMockEmployeeServiceWithDefaults();
    mockEmployerService = getMockEmployerServiceWithDefaults();
    mockTransactionMappingService = getMockTransactionMapperServiceWithDefaults();
    mockTransactionService = getMockTransactionServiceWithDefaults();
    mockMonoService = getMockMonoServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useFactory: () => instance(mockAdminService),
        },
        {
          provide: ConsumerService,
          useFactory: () => instance(mockConsumerService),
        },
        {
          provide: ExchangeRateService,
          useFactory: () => instance(mockExchangeRateService),
        },
        {
          provide: EmployeeService,
          useFactory: () => instance(mockEmployeeService),
        },
        {
          provide: EmployerService,
          useFactory: () => instance(mockEmployerService),
        },
        {
          provide: TransactionService,
          useFactory: () => instance(mockTransactionService),
        },
        {
          provide: MonoService,
          useFactory: () => instance(mockMonoService),
        },
        {
          provide: TRANSACTION_MAPPING_SERVICE_PROVIDER,
          useFactory: () => instance(mockTransactionMappingService),
        },
        AdminMapper,
        ConsumerMapper,
      ],
    }).compile();

    when(mockMonoService.getTransactionByNobaTransactionID(anything())).thenResolve(null);
    adminController = app.get<AdminController>(AdminController);
    consumerMapper = app.get<ConsumerMapper>(ConsumerMapper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createNobaAdmin", () => {
    it("Consumers shouldn't be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
        name: "Admin",
      };
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
      });

      try {
        await adminController.createNobaAdmin({ user: { entity: authenticatedConsumer } }, newNobaAdmin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
        name: "Admin",
      };
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      try {
        await adminController.createNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, newNobaAdmin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role shouldn't be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
        name: "Admin",
      };
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      try {
        await adminController.createNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, newNobaAdmin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'ADMIN' role should be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
        name: "Admin",
      };
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.addNobaAdmin(anything())).thenResolve(
        Admin.createAdmin({
          id: "1111111111",
          email: newNobaAdmin.email,
          name: newNobaAdmin.name,
          role: newNobaAdmin.role,
        }),
      );

      const result: NobaAdminDTO = await adminController.createNobaAdmin(
        { user: { entity: authenticatedNobaAdmin } },
        newNobaAdmin,
      );
      const addNobaAdminArgument: Admin = capture(mockAdminService.addNobaAdmin).last()[0];

      expect(result.id).toBeDefined();
      expect(result.email).toEqual(newNobaAdmin.email);
      expect(result.name).toEqual(newNobaAdmin.name);
      expect(result.role).toEqual(newNobaAdmin.role);

      expect(addNobaAdminArgument.props.email).toEqual(newNobaAdmin.email);
      expect(addNobaAdminArgument.props.name).toEqual(newNobaAdmin.name);
      expect(addNobaAdminArgument.props.role).toEqual(newNobaAdmin.role);
    });

    it("should return AlreadyExists error if email matches with an existing NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: EXISTING_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
        name: "Admin",
      };
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.addNobaAdmin(anything())).thenResolve(undefined);

      try {
        await adminController.createNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, newNobaAdmin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
      }
    });
  });

  describe("getNobaAdmin", () => {
    it("Logged-in Consumer shouldn't be able to call GET /admins", async () => {
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        id: "XXXXXXXXXX",
        email: "consumer@noba.com",
      });

      try {
        await adminController.getNobaAdmin({ user: { entity: authenticatedConsumer } });
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("Logged-in NobaAdmins should successfully get the details of NobaAdmin", async () => {
      const adminId = "XXXXXXXXXX";
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      const queriedNobaAdmin = await adminController.getNobaAdmin({ user: { entity: authenticatedNobaAdmin } });

      expect(queriedNobaAdmin.id).toBe(authenticatedNobaAdmin.props.id);
      expect(queriedNobaAdmin.email).toBe(authenticatedNobaAdmin.props.email);
      expect(queriedNobaAdmin.name).toBe(authenticatedNobaAdmin.props.name);
      expect(queriedNobaAdmin.role).toBe(authenticatedNobaAdmin.props.role);
    });
  });

  describe("getAllNobaAdmins", () => {
    it("should throw ForbiddenException if noba admin does not have permissions", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      await expect(
        async () =>
          await adminController.getAllNobaAdmins({
            user: {
              entity: authenticatedNobaAdmin,
            },
          }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException if Consumer accesses this endpoint", async () => {
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        id: "XXXXXXXXXX",
        email: "fake+consumer@noba.com",
      });

      await expect(
        async () =>
          await adminController.getAllNobaAdmins({
            user: {
              entity: authenticatedConsumer,
            },
          }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should return all nobaAdmins", async () => {
      const adminId = "XXXXXXXXXX";
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const allAdmins = [
        authenticatedNobaAdmin,
        Admin.createAdmin({
          id: "fake-id-1234",
          email: "fake+admin@noba.com",
          role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
        }),
      ];

      when(mockAdminService.getAllNobaAdmins()).thenResolve(allAdmins);

      const queriedNobaAdmins = await adminController.getAllNobaAdmins({
        user: {
          entity: authenticatedNobaAdmin,
        },
      });

      expect(queriedNobaAdmins.length).toBe(allAdmins.length);
    });
  });

  describe("updateNobaAdminPrivileges", () => {
    it("Consumer shouldn't be able to update the role of the an admin", async () => {
      const ADMINid = "1111111111";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedConsumer } }, ADMINid, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to update the role of the an admin", async () => {
      const ADMINid = "1111111111";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, ADMINid, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role shouldn't be able to update the role of the an admin", async () => {
      const ADMINid = "1111111111";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, ADMINid, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'ADMIN' role should be able to update the role of the an admin", async () => {
      const TARGET_ADMINid = "1111111111";
      const TARGET_ADMIN_EMAIL = "admin.to.update@noba.com";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const CURRENT_ROLE = NOBA_ADMIN_ROLE_TYPES.BASIC;

      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.getAdminById(TARGET_ADMINid)).thenResolve(
        Admin.createAdmin({
          id: TARGET_ADMINid,
          name: "Admin",
          email: TARGET_ADMIN_EMAIL,
          role: CURRENT_ROLE,
        }),
      );

      when(mockAdminService.updateNobaAdmin(TARGET_ADMINid, UPDATED_ROLE, "Admin")).thenResolve(
        Admin.createAdmin({
          id: TARGET_ADMINid,
          name: "Admin",
          email: TARGET_ADMIN_EMAIL,
          role: UPDATED_ROLE,
        }),
      );

      const request: UpdateNobaAdminDTO = {
        role: UPDATED_ROLE,
      };
      const result = await adminController.updateNobaAdmin(
        { user: { entity: authenticatedNobaAdmin } },
        TARGET_ADMINid,
        request,
      );

      expect(result).toEqual({
        id: TARGET_ADMINid,
        name: "Admin",
        email: TARGET_ADMIN_EMAIL,
        role: UPDATED_ROLE,
      });
    });

    it("NobaAdmin with 'ADMIN' role should be able to update the 'name' of the an admin", async () => {
      const TARGET_ADMINid = "1111111111";
      const TARGET_ADMIN_EMAIL = "admin.to.update@noba.com";
      const UPDATED_NAME = "New Admin Name";
      const CURRENT_NAME = "Admin Name";

      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.getAdminById(TARGET_ADMINid)).thenResolve(
        Admin.createAdmin({
          id: TARGET_ADMINid,
          name: CURRENT_NAME,
          email: TARGET_ADMIN_EMAIL,
          role: NOBA_ADMIN_ROLE_TYPES.BASIC,
        }),
      );

      when(mockAdminService.updateNobaAdmin(TARGET_ADMINid, NOBA_ADMIN_ROLE_TYPES.BASIC, UPDATED_NAME)).thenResolve(
        Admin.createAdmin({
          id: TARGET_ADMINid,
          name: UPDATED_NAME,
          email: TARGET_ADMIN_EMAIL,
          role: NOBA_ADMIN_ROLE_TYPES.BASIC,
        }),
      );

      const request: UpdateNobaAdminDTO = {
        name: UPDATED_NAME,
      };
      const result = await adminController.updateNobaAdmin(
        { user: { entity: authenticatedNobaAdmin } },
        TARGET_ADMINid,
        request,
      );

      expect(result).toEqual({
        id: TARGET_ADMINid,
        name: UPDATED_NAME,
        email: TARGET_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });
    });

    it("NobaAdmin with 'ADMIN' role should be able to update both 'name' & 'role' of the an admin", async () => {
      const TARGET_ADMINid = "1111111111";
      const TARGET_ADMIN_EMAIL = "admin.to.update@noba.com";

      const UPDATED_NAME = "New Admin Name";
      const CURRENT_NAME = "Admin Name";
      const UPDATE_ROLE = NOBA_ADMIN_ROLE_TYPES.BASIC;
      const CURRENT_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;

      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.getAdminById(TARGET_ADMINid)).thenResolve(
        Admin.createAdmin({
          id: TARGET_ADMINid,
          name: CURRENT_NAME,
          email: TARGET_ADMIN_EMAIL,
          role: CURRENT_ROLE,
        }),
      );

      when(mockAdminService.updateNobaAdmin(TARGET_ADMINid, UPDATE_ROLE, UPDATED_NAME)).thenResolve(
        Admin.createAdmin({
          id: TARGET_ADMINid,
          name: UPDATED_NAME,
          email: TARGET_ADMIN_EMAIL,
          role: UPDATE_ROLE,
        }),
      );

      const request: UpdateNobaAdminDTO = {
        name: UPDATED_NAME,
        role: UPDATE_ROLE,
      };
      const result = await adminController.updateNobaAdmin(
        { user: { entity: authenticatedNobaAdmin } },
        TARGET_ADMINid,
        request,
      );

      expect(result).toEqual({
        id: TARGET_ADMINid,
        name: UPDATED_NAME,
        email: TARGET_ADMIN_EMAIL,
        role: UPDATE_ROLE,
      });
    });

    it("NobaAdmin shouldn't be able to update it's own role", async () => {
      const ADMINid = "1111111111";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: ADMINid,
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, ADMINid, request);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw 'NotFoundException' error if AdminId doesn't exists.", async () => {
      const ADMINid = "1111111111";
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.getAdminById(ADMINid)).thenReject(new NotFoundException());

      try {
        const request: UpdateNobaAdminDTO = {
          role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, ADMINid, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe("deleteNobaAdmin", () => {
    it("Consumers shouldn't be able to delete any NobaAdmin", async () => {
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
      });
      try {
        await adminController.deleteNobaAdmin({ user: { entity: authenticatedConsumer } }, "id");
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to delete any NobaAdmin", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      try {
        await adminController.deleteNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, "id");
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role shouldn't be able to delete any NobaAdmin", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      try {
        await adminController.deleteNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, "id");
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'ADMIN' role should delete the specified NobaAdmin & returns it's ID", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const adminId = "1111111111";
      when(mockAdminService.deleteNobaAdmin(adminId)).thenResolve(adminId);

      const result: DeleteNobaAdminDTO = await adminController.deleteNobaAdmin(
        { user: { entity: authenticatedNobaAdmin } },
        adminId,
      );

      expect(result.id).toEqual(adminId);
    });

    it("should throw 'NotFoundException' if user with ID doesn't exists", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const adminId = "1111111111";
      when(mockAdminService.deleteNobaAdmin(adminId)).thenReject(new BadRequestError({ message: "Not Found" }));
      expect(
        async () => await adminController.deleteNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, adminId),
      ).rejects.toThrow(NotFoundException);
    });

    it("NobaAdmin shouldn't be able to delete it's own account", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      try {
        await adminController.deleteNobaAdmin(
          { user: { entity: authenticatedNobaAdmin } },
          authenticatedNobaAdmin.props.id,
        );
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe("updateConsumer", () => {
    it("NobaAdmin with 'Admin' role should be able to update consumer details", async () => {
      const adminId = "AAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const consumerProps: ConsumerProps = {
        id: "test-consumer-1234",
        email: "consumer@noba.com",
        locale: "en",
        verificationData: {
          kycCheckStatus: KYCStatus.PENDING,
          documentVerificationStatus: DocumentVerificationStatus.REQUIRED,
          provider: KYCProvider.SARDINE,
          kycVerificationTimestamp: new Date(),
          documentVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
        },
        handle: "fake-handle",
        displayEmail: "Consumer@noba.com",
        firstName: "Fake",
        lastName: "Consumer",
        phone: null,
        gender: "Female",
        dateOfBirth: "1992-10-12",
        isLocked: false,
        isDisabled: false,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        socialSecurityNumber: "123456789",
        referralCode: "123456789",
        referredByID: null,
      };

      const updatedConsumerProps: Partial<ConsumerProps> = {
        id: consumerProps.id,
        verificationData: {
          ...consumerProps.verificationData,
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
        },
      };

      const updatedConsumerObj: Consumer = Consumer.createConsumer({
        ...consumerProps,
        ...updatedConsumerProps,
      });

      when(mockConsumerService.getAllConsumerWallets("test-consumer-1234")).thenResolve([]);
      when(mockConsumerService.getAllPaymentMethodsForConsumer("test-consumer-1234")).thenResolve([]);

      when(mockConsumerService.getConsumer(consumerProps.id))
        .thenResolve(Consumer.createConsumer(consumerProps))
        .thenResolve(updatedConsumerObj);

      when(mockConsumerService.updateConsumer(anything())).thenResolve(updatedConsumerObj);

      when(mockAdminService.updateConsumer(consumerProps.id, anything())).thenResolve({
        ...updatedConsumerObj.props,
        gender: Gender.FEMALE,
        walletDetails: [
          {
            walletID: "wallet-1234",
            walletProvider: "Circle",
            currentBalance: 100,
          },
        ],
      });

      const result = await adminController.updateConsumer(
        consumerProps.id,
        {
          verificationData: {
            kycCheckStatus: KYCStatus.APPROVED,
            documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          },
        },
        {
          user: { entity: requestingNobaAdmin },
        },
      );

      expect(result.id).toBe(consumerProps.id);
      expect(result.verificationData.kycCheckStatus).toBe(KYCStatus.APPROVED);
      expect(result.verificationData.documentVerificationStatus).toBe(DocumentVerificationStatus.APPROVED);
      expect(result.walletDetails).toEqual([
        {
          walletID: "wallet-1234",
          walletProvider: "Circle",
          currentBalance: 100,
        },
      ]);
    });
  });

  describe("createExchangeRate", () => {
    it("NobaAdmin with 'Admin' role should be able to create exchange rates", async () => {
      const adminId = "AAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const newExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      };

      const createdExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: newExchangeRate.numeratorCurrency,
        denominatorCurrency: newExchangeRate.denominatorCurrency,
        bankRate: newExchangeRate.bankRate,
        nobaRate: newExchangeRate.nobaRate,
        expirationTimestamp: newExchangeRate.expirationTimestamp,
      };

      const createSpy = jest.spyOn(mockExchangeRateService, "createExchangeRate");
      when(mockExchangeRateService.createExchangeRate(newExchangeRate)).thenResolve(createdExchangeRate);

      const returnedExchangeRate = await adminController.createExchangeRate(
        {
          user: { entity: requestingNobaAdmin },
        },
        newExchangeRate,
        "false",
      );

      expect(createSpy).toHaveBeenCalledWith(newExchangeRate);
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(returnedExchangeRate[0]).toEqual(createdExchangeRate);
    });

    it("Regular user (non-admin) should not be able to create exchange rates", async () => {
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
      });

      const newExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      };

      expect(
        async () =>
          await adminController.createExchangeRate(
            {
              user: { entity: authenticatedConsumer },
            },
            newExchangeRate,
            "false",
          ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("Null exchange rate returns a BadRequestException", async () => {
      const newExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      };

      const requestingNobaAdmin = Admin.createAdmin({
        id: "admin-123456789",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockExchangeRateService.createExchangeRate(newExchangeRate)).thenResolve(null);

      expect(
        async () =>
          await adminController.createExchangeRate(
            {
              user: { entity: requestingNobaAdmin },
            },
            newExchangeRate,
            "false",
          ),
      ).rejects.toThrow(BadRequestException);
    });

    it("0 bankRate returns a BadRequestException", async () => {
      const newExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 0,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      };

      const requestingNobaAdmin = Admin.createAdmin({
        id: "admin-123456789",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      expect(
        async () =>
          await adminController.createExchangeRate(
            {
              user: { entity: requestingNobaAdmin },
            },
            newExchangeRate,
            "false",
          ),
      ).rejects.toThrow(BadRequestException);
    });

    it("0 nobaRate returns a BadRequestException", async () => {
      const newExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 0,
        expirationTimestamp: new Date(),
      };

      const requestingNobaAdmin = Admin.createAdmin({
        id: "admin-123456789",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      expect(
        async () =>
          await adminController.createExchangeRate(
            {
              user: { entity: requestingNobaAdmin },
            },
            newExchangeRate,
            "false",
          ),
      ).rejects.toThrow(BadRequestException);
    });

    it("NobaAdmin with 'Admin' role should be able to create exchange rates including inverse", async () => {
      const adminId = "AAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const newExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      };

      const createdExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: newExchangeRate.numeratorCurrency,
        denominatorCurrency: newExchangeRate.denominatorCurrency,
        bankRate: newExchangeRate.bankRate,
        nobaRate: newExchangeRate.nobaRate,
        expirationTimestamp: newExchangeRate.expirationTimestamp,
      };

      const inverseNewExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: "COP",
        denominatorCurrency: "USD",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      };

      const inverseCreatedExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: inverseNewExchangeRate.numeratorCurrency,
        denominatorCurrency: inverseNewExchangeRate.denominatorCurrency,
        bankRate: 1 / inverseNewExchangeRate.bankRate,
        nobaRate: 1 / inverseNewExchangeRate.nobaRate,
        expirationTimestamp: inverseNewExchangeRate.expirationTimestamp,
      };

      when(mockExchangeRateService.createExchangeRate(deepEqual(newExchangeRate))).thenResolve(createdExchangeRate);
      when(mockExchangeRateService.createExchangeRate(deepEqual(inverseCreatedExchangeRate))).thenResolve(
        inverseCreatedExchangeRate,
      );

      const returnedExchangeRates = await adminController.createExchangeRate(
        {
          user: { entity: requestingNobaAdmin },
        },
        newExchangeRate,
        "true",
      );

      const [firstExchangeRate] = capture(mockExchangeRateService.createExchangeRate).first();
      const [secondExchangeRate] = capture(mockExchangeRateService.createExchangeRate).second();
      expect(firstExchangeRate).toEqual(newExchangeRate);
      expect(secondExchangeRate).toEqual(inverseCreatedExchangeRate);
      expect(returnedExchangeRates[0]).toEqual(newExchangeRate);
      expect(returnedExchangeRates[1]).toEqual(inverseCreatedExchangeRate);
    });

    it("Inverse exchange rate creation failure should return BadRequestException", async () => {
      const adminId = "AAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const newExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      };

      const createdExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: newExchangeRate.numeratorCurrency,
        denominatorCurrency: newExchangeRate.denominatorCurrency,
        bankRate: newExchangeRate.bankRate,
        nobaRate: newExchangeRate.nobaRate,
        expirationTimestamp: newExchangeRate.expirationTimestamp,
      };

      const inverseNewExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: "COP",
        denominatorCurrency: "USD",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      };

      const inverseCreatedExchangeRate: ExchangeRateDTO = {
        numeratorCurrency: inverseNewExchangeRate.numeratorCurrency,
        denominatorCurrency: inverseNewExchangeRate.denominatorCurrency,
        bankRate: 1 / inverseNewExchangeRate.bankRate,
        nobaRate: 1 / inverseNewExchangeRate.nobaRate,
        expirationTimestamp: inverseNewExchangeRate.expirationTimestamp,
      };

      when(mockExchangeRateService.createExchangeRate(deepEqual(newExchangeRate))).thenResolve(createdExchangeRate);
      when(mockExchangeRateService.createExchangeRate(deepEqual(inverseCreatedExchangeRate))).thenResolve(null);

      expect(
        async () =>
          await adminController.createExchangeRate(
            {
              user: { entity: requestingNobaAdmin },
            },
            newExchangeRate,
            "true",
          ),
      ).rejects.toThrow(BadRequestException);

      const [firstExchangeRate] = capture(mockExchangeRateService.createExchangeRate).first();
      expect(firstExchangeRate).toEqual(newExchangeRate);
    });
  });

  describe("getAccountBalances", () => {
    it("Should return expected account balances", async () => {
      const requestingNobaAdmin = Admin.createAdmin({
        id: "admin-123456789",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const expectedAccountBalances = [
        {
          accountID: "test-account-id",
          currency: "USD",
          balance: 10.99,
        },
        {
          accountID: "test-account-id-2",
          currency: "USD",

          balance: 2000.22,
        },
      ];

      when(
        mockAdminService.getBalanceForAccounts(
          ACCOUNT_BALANCE_TYPES.CIRCLE,
          deepEqual(["test-account-id", "test-account-id-2"]),
        ),
      ).thenResolve(expectedAccountBalances);

      const accountBalances = await adminController.getAccountBalances(
        {
          user: { entity: requestingNobaAdmin },
        },
        {
          accountBalanceType: ACCOUNT_BALANCE_TYPES.CIRCLE,
          accountIDs: ["test-account-id", "test-account-id-2"],
        },
      );

      expect(accountBalances).toEqual(expectedAccountBalances);
    });

    it("Should return expected account balances with string accountID", async () => {
      const requestingNobaAdmin = Admin.createAdmin({
        id: "admin-123456789",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const expectedAccountBalances = [
        {
          accountID: "test-account-id",
          currency: "USD",
          balance: 10.99,
        },
      ];

      when(
        mockAdminService.getBalanceForAccounts(ACCOUNT_BALANCE_TYPES.CIRCLE, deepEqual(["test-account-id"])),
      ).thenResolve(expectedAccountBalances);

      const accountBalances = await adminController.getAccountBalances(
        {
          user: { entity: requestingNobaAdmin },
        },
        {
          accountBalanceType: ACCOUNT_BALANCE_TYPES.CIRCLE,
          accountIDs: "test-account-id" as unknown as string[],
        },
      );

      expect(accountBalances).toEqual(expectedAccountBalances);
    });

    it("Regular user (non-admin) should not be able view balances", async () => {
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
      });

      expect(
        async () =>
          await adminController.getAccountBalances(
            {
              user: { entity: authenticatedConsumer },
            },
            {
              accountBalanceType: ACCOUNT_BALANCE_TYPES.CIRCLE,
              accountIDs: ["test-account-id"],
            },
          ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updatePayrollStatus", () => {
    it("NobaAdmin with 'Admin' role should be able to update the Payroll status", async () => {
      const adminID = "AAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });
      const payroll = getRandomPayroll("EMPLOYER_ID").payroll;

      when(mockEmployerService.updatePayroll(payroll.id, anything())).thenResolve(payroll);

      const returnedPayroll = await adminController.updatePayrollStatus(
        {
          user: { entity: requestingNobaAdmin },
        },
        payroll.id,
        { status: PayrollStatus.FUNDED },
      );

      expect(returnedPayroll).toStrictEqual({
        id: payroll.id,
        employerID: payroll.employerID,
        reference: payroll.referenceNumber,
        payrollDate: payroll.payrollDate,
        totalDebitAmount: payroll.totalDebitAmount,
        totalCreditAmount: payroll.totalCreditAmount,
        exchangeRate: payroll.exchangeRate,
        debitCurrency: payroll.debitCurrency,
        creditCurrency: payroll.creditCurrency,
        status: payroll.status,
      });

      const [propagatedPayrollID, propagatedRequestBody] = capture(mockEmployerService.updatePayroll).last();
      expect(propagatedPayrollID).toBe(payroll.id);
      expect(propagatedRequestBody).toStrictEqual({
        status: PayrollStatus.FUNDED,
      });
    });

    it("Regular user (non-admin) should not be able to update the payroll status", async () => {
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
      });

      expect(
        async () =>
          await adminController.updatePayrollStatus(
            {
              user: { entity: authenticatedConsumer },
            },
            "PAYROLL_ID",
            { status: PayrollStatus.FUNDED },
          ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("retryPayroll", () => {
    it("NobaAdmin with 'Admin' role should be able to retry the Payroll", async () => {
      const adminID = "AAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });
      const payroll = getRandomPayroll("EMPLOYER_ID").payroll;

      when(mockEmployerService.retryPayroll(payroll.id)).thenResolve(payroll);

      const returnedPayroll = await adminController.retryPayroll(
        {
          user: { entity: requestingNobaAdmin },
        },
        payroll.id,
      );

      expect(returnedPayroll).toStrictEqual({
        id: payroll.id,
        employerID: payroll.employerID,
        reference: payroll.referenceNumber,
        payrollDate: payroll.payrollDate,
        totalDebitAmount: payroll.totalDebitAmount,
        totalCreditAmount: payroll.totalCreditAmount,
        exchangeRate: payroll.exchangeRate,
        debitCurrency: payroll.debitCurrency,
        creditCurrency: payroll.creditCurrency,
        status: payroll.status,
      });

      const [propagatedPayrollID] = capture(mockEmployerService.retryPayroll).last();
      expect(propagatedPayrollID).toBe(payroll.id);
    });

    it("Regular user (non-admin) should not be able to retry the payroll", async () => {
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
      });

      expect(
        async () =>
          await adminController.retryPayroll(
            {
              user: { entity: authenticatedConsumer },
            },
            "PAYROLL_ID",
          ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  /*describe("getConsumers", () => {
    it("Should return expected consumers", async () => {
      const requestingNobaAdmin = Admin.createAdmin({
        id: "admin-123456789",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const consumerData: Consumer[] = [
        Consumer.createConsumer({
          id: "admin-123456790",
          firstName: "Rosie",
          lastName: "Noba",
          email: "rosie@noba.com",
          handle: "rosie-noba",
          referralCode: "123456789",
        }),
        Consumer.createConsumer({
          id: "admin-0987654321",
          firstName: "Rosie2",
          lastName: "Noba",
          email: "rosie2@noba.com",
          handle: "rosie2-noba",
          referralCode: "987654321",
        }),
      ];

      const expectedConsumers: ConsumerDTO[] = [
        {
          id: "admin-123456790",
          firstName: "Rosie",
          lastName: "Noba",
          email: "rosie@noba.com",
          handle: "rosie-noba",
          status: UserState.APPROVED,
          referralCode: "123456789",
          kycVerificationData: {
            kycVerificationStatus: KycVerificationState.NOT_SUBMITTED,
          },
          documentVerificationData: {
            documentVerificationStatus: DocumentVerificationState.NOT_SUBMITTED,
          },
        },
        {
          id: "admin-0987654321",
          firstName: "Rosie2",
          lastName: "Noba",
          email: "rosie2@noba.com",
          handle: "rosie2-noba",
          status: UserState.APPROVED,
          referralCode: "987654321",
          kycVerificationData: {
            kycVerificationStatus: KycVerificationState.NOT_SUBMITTED,
          },
          documentVerificationData: {
            documentVerificationStatus: DocumentVerificationState.NOT_SUBMITTED,
          },
        },
      ];

      when(mockConsumerService.findConsumers(deepEqual({ name: "Rosie" }))).thenResolve(consumerData);

      const consumers = await adminController.getConsumers(
        { user: { entity: requestingNobaAdmin } },
        { name: "Rosie" },
      );

      expect(consumers).toEqual(expectedConsumers);
    });
  });*/

  describe("getTransaction", () => {
    it("should return the transaction after resolving debit consumer id to tag", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      when(mockAdminService.getTransactionByTransactionRef(transactionRef)).thenResolve(transaction);
      when(mockConsumerService.getConsumer(consumerID)).thenResolve(consumer);
      const expectedResult: TransactionDTO = {
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: undefined,
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };

      when(mockTransactionMappingService.toTransactionDTO(transaction, undefined, undefined)).thenResolve(
        expectedResult,
      );

      const adminID = "AAAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const result: TransactionDTO = await adminController.getTransaction(
        {
          user: { entity: requestingNobaAdmin },
        },
        IncludeEventTypes.NONE,
        transactionRef,
      );

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return the transaction after resolving credit consumer id to tag", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID, true);

      when(mockAdminService.getTransactionByTransactionRef(transactionRef)).thenResolve(transaction);
      when(mockConsumerService.getConsumer(consumerID)).thenResolve(consumer);
      const expectedResult: TransactionDTO = {
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        creditConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        debitConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: undefined,
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };
      when(mockTransactionMappingService.toTransactionDTO(transaction, undefined, undefined)).thenResolve(
        expectedResult,
      );

      const adminID = "AAAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const result: TransactionDTO = await adminController.getTransaction(
        {
          user: { entity: requestingNobaAdmin },
        },
        IncludeEventTypes.NONE,
        transactionRef,
      );

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return a transfer transaction after resolving both credit and debit consumer IDs to tags", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const creditConsumer = getRandomConsumer("creditConsumerID");
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      transaction.creditConsumerID = creditConsumer.props.id;

      when(mockAdminService.getTransactionByTransactionRef(transactionRef)).thenResolve(transaction);
      when(mockConsumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(mockConsumerService.getConsumer(creditConsumer.props.id)).thenResolve(creditConsumer);

      const expectedResult: TransactionDTO = {
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        creditConsumer: {
          id: creditConsumer.props.id,
          firstName: creditConsumer.props.firstName,
          handle: creditConsumer.props.handle,
          lastName: creditConsumer.props.lastName,
        },
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: undefined,
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };
      when(mockTransactionMappingService.toTransactionDTO(transaction, undefined, undefined)).thenResolve(
        expectedResult,
      );

      const adminID = "AAAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const result: TransactionDTO = await adminController.getTransaction(
        {
          user: { entity: requestingNobaAdmin },
        },
        IncludeEventTypes.NONE,
        transactionRef,
      );

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return transaction without resolving consumer id to tag", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      when(mockAdminService.getTransactionByTransactionRef(transactionRef)).thenResolve(transaction);

      when(mockConsumerService.getConsumer(consumerID)).thenResolve(consumer);

      const expectedResult: TransactionDTO = {
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: undefined,
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };
      when(mockTransactionMappingService.toTransactionDTO(transaction, undefined, undefined)).thenResolve(
        expectedResult,
      );

      const adminID = "AAAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const result: TransactionDTO = await adminController.getTransaction(
        {
          user: { entity: requestingNobaAdmin },
        },
        IncludeEventTypes.NONE,
        transactionRef,
      );

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return transaction with paymentCollectionLink for WALLET_DEPOSIT", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      when(mockConsumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(mockAdminService.getTransactionByTransactionRef(transactionRef)).thenResolve(transaction);
      const monoTransaction: MonoTransaction = {
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        id: "monoTransactionID",
        nobaTransactionID: transaction.id,
        state: MonoTransactionState.SUCCESS,
        type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        collectionLinkDepositDetails: {
          collectionURL: "collectionURL",
          collectionLinkID: "collectionLinkID",
        },
      };
      when(mockMonoService.getTransactionByNobaTransactionID(anything())).thenResolve(monoTransaction);

      const expectedResult: TransactionDTO = {
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: undefined,
        paymentCollectionLink: monoTransaction.collectionLinkDepositDetails.collectionURL,
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };
      when(mockTransactionMappingService.toTransactionDTO(transaction, undefined, undefined)).thenResolve(
        expectedResult,
      );

      const adminID = "AAAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const result: TransactionDTO = await adminController.getTransaction(
        {
          user: { entity: requestingNobaAdmin },
        },
        IncludeEventTypes.NONE,
        transactionRef,
      );

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return the transaction with events", async () => {
      const consumerID = "testConsumerID";
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      const consumer = getRandomConsumer(consumerID);
      when(mockAdminService.getTransactionByTransactionRef(transactionRef)).thenResolve(transaction);

      const transactionEvents: TransactionEvent[] = [
        {
          id: "testEventID",
          timestamp: new Date(),
          transactionID: transaction.id,
          message: "Test event",
          details: "This is a test event",
          internal: false,
          key: "EVENT_KEY",
          param1: "Param 1",
          param2: "Param 2",
          param3: "Param 3",
          param4: "Param 4",
          param5: "Param 5",
        },
        {
          id: "testEvent2ID",
          timestamp: new Date(),
          transactionID: transaction.id,
          message: "Test event 2",
          details: "This is a test event 2",
          internal: false,
          key: "EVENT_KEY_2",
          param1: "Param 1",
          param2: "Param 2",
          param3: "Param 3",
          param4: "Param 4",
          param5: "Param 5",
        },
      ];

      const transactionEventsToReturn: TransactionEventDTO[] = [
        {
          message: "Test event",
          details: "This is a test event",
          internal: false,
          text: "Test event",
          timestamp: transactionEvents[0].timestamp,
        },
        {
          message: "Test event 2",
          details: "This is a test event 2",
          internal: false,
          text: "Test event 2",
          timestamp: transactionEvents[1].timestamp,
        },
      ];

      when(mockAdminService.getTransactionEvents(transaction.id, true)).thenResolve(transactionEvents);
      when(mockConsumerService.getConsumer(consumerID)).thenResolve(consumer);

      const expectedResult: TransactionDTO = {
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: transactionEventsToReturn,
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };

      const transactionEventToReturn: TransactionEvent[] = [
        {
          id: "testEventID",
          timestamp: transactionEvents[0].timestamp,
          transactionID: transaction.id,
          message: transactionEventsToReturn[0].message,
          details: transactionEventsToReturn[0].details,
          internal: false,
          key: "EVENT_KEY",
          param1: "Param 1",
          param2: "Param 2",
          param3: "Param 3",
          param4: "Param 4",
          param5: "Param 5",
        },
        {
          id: "testEvent2ID",
          timestamp: transactionEvents[1].timestamp,
          transactionID: transaction.id,
          message: transactionEventsToReturn[1].message,
          details: transactionEventsToReturn[1].details,
          internal: false,
          key: "EVENT_KEY_2",
          param1: "Param 1",
          param2: "Param 2",
          param3: "Param 3",
          param4: "Param 4",
          param5: "Param 5",
        },
      ];

      when(
        mockTransactionMappingService.toTransactionDTO(transaction, undefined, deepEqual(transactionEventToReturn)),
      ).thenResolve(expectedResult);

      const adminID = "AAAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const result: TransactionDTO = await adminController.getTransaction(
        {
          user: { entity: requestingNobaAdmin },
        },
        IncludeEventTypes.ALL,
        transactionRef,
      );

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return empty events array if events requested but none exist", async () => {
      const consumerID = "testConsumerID";
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      const consumer = getRandomConsumer(consumerID);
      when(mockAdminService.getTransactionByTransactionRef(transactionRef)).thenResolve(transaction);
      when(mockAdminService.getTransactionEvents(transaction.id, true)).thenResolve([]);
      when(mockConsumerService.getConsumer(consumerID)).thenResolve(consumer);

      const expectedResult: TransactionDTO = {
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: [],
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };

      when(mockTransactionMappingService.toTransactionDTO(transaction, undefined, deepEqual([]))).thenResolve(
        expectedResult,
      );

      const adminID = "AAAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const result: TransactionDTO = await adminController.getTransaction(
        {
          user: { entity: requestingNobaAdmin },
        },
        IncludeEventTypes.ALL,
        transactionRef,
      );

      expect(result).toStrictEqual(expectedResult);
    });

    it("should throw NotFoundException when transaction is not found", async () => {
      const transactionRef = "transactionRef";
      when(mockAdminService.getTransactionByTransactionRef(transactionRef)).thenResolve(null);

      const adminID = "AAAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });
      expect(
        async () =>
          await adminController.getTransaction(
            {
              user: { entity: requestingNobaAdmin },
            },
            IncludeEventTypes.NONE,
            transactionRef,
          ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAllTransactions", () => {
    it("should get filtered transactions with resolved tags", async () => {
      const adminID = "AAAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        id: adminID,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      transaction.transactionRef = transactionRef;
      transaction.status = TransactionStatus.COMPLETED;

      const filter: TransactionFilterOptionsDTO = {
        consumerID: consumerID,
        transactionStatus: TransactionStatus.COMPLETED,
        pageLimit: 5,
        pageOffset: 1,
      };
      when(mockConsumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(mockAdminService.getFilteredTransactions(deepEqual(filter))).thenResolve({
        items: [transaction],
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
      });

      when(mockTransactionMappingService.toTransactionDTO(transaction)).thenResolve({
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: [],
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      });

      const allTransactions = await adminController.getAllTransactions(
        {
          user: { entity: requestingNobaAdmin },
        },
        {
          consumerID: consumerID,
          transactionStatus: TransactionStatus.COMPLETED,
          pageLimit: 5,
          pageOffset: 1,
        },
      );

      expect(allTransactions.items.length).toBe(1);
      expect(allTransactions.items[0].transactionRef).toBe(transactionRef);
      expect(allTransactions.items[0].debitConsumer.id).toBe(consumerID);
      expect(allTransactions.items[0].creditConsumer).toBeNull();
    });
  });

  describe("getExchangeRate", () => {
    it("should return the requested exchange rate", async () => {
      const requestingAdmin = Admin.createAdmin({
        id: "fake-admin-1234",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });
      when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve({
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      });

      const result = await adminController.getExchangeRate("USD", "COP", {
        user: { entity: requestingAdmin },
      });

      // Just ensuring something's returned. Other unit tests are responsible for exactly what's returned.
      expect(result).not.toBeNull();
    });

    it("should throw NotFoundException if the currency pair doesn't exist", async () => {
      const requestingAdmin = Admin.createAdmin({
        id: "fake-admin-1234",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });
      when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(null);

      expect(async () => {
        await adminController.getExchangeRate("USD", "COP", {
          user: { entity: requestingAdmin },
        });
      }).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if the numerator currency is not provided", async () => {
      const requestingAdmin = Admin.createAdmin({
        id: "fake-admin-1234",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });
      expect(async () => {
        await adminController.getExchangeRate(null, "COP", { user: { entity: requestingAdmin } });
      }).rejects.toThrow(BadRequestException);

      expect(async () => {
        await adminController.getExchangeRate(undefined, "COP", { user: { entity: requestingAdmin } });
      }).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if the denominator currency is not provided", async () => {
      const requestingAdmin = Admin.createAdmin({
        id: "fake-admin-1234",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });
      expect(async () => {
        await adminController.getExchangeRate("USD", null, { user: { entity: requestingAdmin } });
      }).rejects.toThrow(BadRequestException);

      expect(async () => {
        await adminController.getExchangeRate(undefined, null, { user: { entity: requestingAdmin } });
      }).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if either currency is not 3 characters", async () => {
      const requestingAdmin = Admin.createAdmin({
        id: "fake-admin-1234",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });
      expect(async () => {
        await adminController.getExchangeRate("US", "COP", { user: { entity: requestingAdmin } });
      }).rejects.toThrow(BadRequestException);

      expect(async () => {
        await adminController.getExchangeRate("USD", "CO", { user: { entity: requestingAdmin } });
      }).rejects.toThrow(BadRequestException);
    });

    it("should throw 'ForbiddenException' if requesting user is not Admin", async () => {
      const consumer = getRandomConsumer("fake-consumer-1234");

      expect(async () => {
        await adminController.getExchangeRate("USD", "COP", { user: { entity: consumer } });
      }).rejects.toThrow(ForbiddenException);
    });
  });

  describe("createTransaction", () => {
    it("should create a transaction", async () => {
      const requestingAdmin = Admin.createAdmin({
        id: "fake-admin-1234",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);

      const transaction: Transaction = getRandomTransaction("fake-consumer-1234");

      when(mockAdminService.initiateTransaction(anything())).thenResolve(transaction);
      const transactionDTO: TransactionDTO = {
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: [],
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };
      when(mockTransactionMappingService.toTransactionDTO(transaction)).thenResolve(transactionDTO);

      const initiateTransactionDTO: InitiateTransactionDTO = {
        workflowName: ConsumerWorkflowName.CREDIT_ADJUSTMENT,
        creditConsumerIDOrTag: consumerID,
        creditAmount: 100,
        creditCurrency: Currency.USD,
        memo: "Test memo",
      };

      expect(
        await adminController.createTransaction({ user: { entity: requestingAdmin } }, initiateTransactionDTO),
      ).toBe(transactionDTO);
    });

    it("should throw 'ForbiddenException' if requesting user is not Admin", async () => {
      const consumer = getRandomConsumer("fake-consumer-1234");

      expect(async () => {
        await adminController.createTransaction({ user: { entity: consumer } }, null);
      }).rejects.toThrow(ForbiddenException);
    });

    it("should throw 'BadRequestException' if failed to create transaction", async () => {
      const requestingAdmin = Admin.createAdmin({
        id: "fake-admin-1234",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const initiateTransactionDTO: InitiateTransactionDTO = {
        workflowName: ConsumerWorkflowName.CREDIT_ADJUSTMENT,
        creditConsumerIDOrTag: "testConsumerID",
        creditAmount: 100,
        creditCurrency: Currency.USD,
        memo: "Test memo",
      };

      when(mockAdminService.initiateTransaction(anything())).thenResolve(null);

      expect(
        async () =>
          await adminController.createTransaction({ user: { entity: requestingAdmin } }, initiateTransactionDTO),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
