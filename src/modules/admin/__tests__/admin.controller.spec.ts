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
import { TransactionService } from "../../../modules/transaction/transaction.service";
import { KYCStatus, DocumentVerificationStatus, KYCProvider } from "@prisma/client";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { ExchangeRateService } from "../../../modules/common/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../modules/common/mocks/mock.exchangerate.service";
import { ExchangeRateDTO } from "../../../modules/common/dto/ExchangeRateDTO";
import { getMockTransactionServiceWithDefaults } from "../../../modules/transaction/mocks/mock.transaction.service";
import { ConsumerMapper } from "../../../modules/consumer/mappers/ConsumerMapper";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";
import { EmployerService } from "../../../modules/employer/employer.service";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { getRandomPayroll } from "../../../modules/employer/test_utils/payroll.test.utils";

const EXISTING_ADMIN_EMAIL = "abc@noba.com";
const NEW_ADMIN_EMAIL = "xyz@noba.com";
const LOGGED_IN_ADMIN_EMAIL = "authenticated@noba.com";

describe("AdminController", () => {
  jest.setTimeout(2000);

  let adminController: AdminController;
  let mockAdminService: AdminService;
  let mockConsumerService: ConsumerService;
  let mockTransactionService: TransactionService;
  let mockExchangeRateService: ExchangeRateService;
  let consumerMapper: ConsumerMapper;
  let employeeService: EmployeeService;
  let employerService: EmployerService;

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };

    mockAdminService = getMockAdminServiceWithDefaults();
    mockConsumerService = getMockConsumerServiceWithDefaults();
    mockTransactionService = getMockTransactionServiceWithDefaults();
    mockExchangeRateService = getMockExchangeRateServiceWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();
    employerService = getMockEmployerServiceWithDefaults();

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
          provide: TransactionService,
          useFactory: () => instance(mockTransactionService),
        },
        {
          provide: ExchangeRateService,
          useFactory: () => instance(mockExchangeRateService),
        },
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        {
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
        AdminMapper,
        ConsumerMapper,
      ],
    }).compile();

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

      when(employerService.updatePayroll(payroll.id, anything())).thenResolve(payroll);

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

      const [propagatedPayrollID, propagatedRequestBody] = capture(employerService.updatePayroll).last();
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
});
