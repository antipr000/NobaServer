import { TestingModule, Test } from "@nestjs/testing";
import { anything, capture, instance, when } from "ts-mockito";
import { AdminService } from "../admin.service";
import { CustomConfigService, getAppConfigModule, TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IAdminTransactionRepo } from "../repos/transactions/AdminTransactionRepo";
import { CommonModule } from "../../common/common.module";
import { Admin } from "../domain/Admin";
import { AdminMapper } from "../mappers/AdminMapper";
import { getTestWinstonModule } from "../../../../src/core/utils/WinstonModule";
import { getMockAdminTransactionRepoWithDefaults } from "../mocks/MockAdminTransactionRepo";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("AdminService", () => {
  jest.setTimeout(5000);

  let mockAdminTransactionRepo: IAdminTransactionRepo;
  let adminService: AdminService;

  beforeEach(async () => {
    mockAdminTransactionRepo = getMockAdminTransactionRepoWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({}),
        getTestWinstonModule(),
      ],
      providers: [
        AdminService,
        {
          provide: "AdminTransactionRepo",
          useFactory: () => instance(mockAdminTransactionRepo),
        },
        AdminMapper
      ],
    }).compile();

    adminService = app.get<AdminService>(AdminService);
  });

  describe("addNobaAdmin", () => {
    it("should return 'undefined' if email already exists", async () => {
      const EXISTING_ADMIN_EMAIL = "abcd@noba.com";
      const existingNobaAdmin = Admin.createAdmin({
        _id: "1111111111",
        name: "Admin",
        email: EXISTING_ADMIN_EMAIL,
        role: "INTERMEDIATE",
      });

      when(mockAdminTransactionRepo.getNobaAdminByEmail(EXISTING_ADMIN_EMAIL)).thenResolve(existingNobaAdmin);

      const result = await adminService.addNobaAdmin(existingNobaAdmin);
      expect(result).toBeUndefined();
    });

    it("should creates a new Admin with the given email & role", async () => {
      const NEW_ADMIN_EMAIL = "xyz@noba.com";
      const newNobaAdmin = Admin.createAdmin({
        _id: "1111111112",
        name: "Admin 2",
        email: NEW_ADMIN_EMAIL,
        role: "INTERMEDIATE",
      });

      when(mockAdminTransactionRepo.getNobaAdminByEmail(NEW_ADMIN_EMAIL)).thenResolve(undefined);
      when(mockAdminTransactionRepo.addNobaAdmin(newNobaAdmin)).thenResolve(newNobaAdmin);

      const result = await adminService.addNobaAdmin(newNobaAdmin);
      expect(result).toStrictEqual(newNobaAdmin);
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
      const INVALID_ID = "2222222222";

      when(mockAdminTransactionRepo.getNobaAdminById(INVALID_ID)).thenResolve(undefined);

      try {
        await adminService.updateNobaAdmin(INVALID_ID, "BASIC", "new name");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it("should successfully update the role and name of the NobaAdmin", async () => {
      const ADMIN_ID = "1111111111";
      const ADMIN_EMAIL = "admin@noba.com";

      const CHANGED_NAME = "New Admin Name";
      const CHANGED_ROLE = "INTERMEDIATE";

      const CURRENT_ROLE = "BASIC";
      const CURRENT_NAME = "Admin Name";

      const nobaAdmin: Admin = Admin.createAdmin({
        _id: ADMIN_ID,
        email: ADMIN_EMAIL,
        name: CURRENT_NAME,
        role: CURRENT_ROLE,
      });
      const updatedNobaAdmin = Admin.createAdmin({
        _id: ADMIN_ID,
        email: ADMIN_EMAIL,
        name: CHANGED_NAME,
        role: CHANGED_ROLE,
      });

      when(mockAdminTransactionRepo.getNobaAdminById(ADMIN_ID)).thenResolve(nobaAdmin);
      when(mockAdminTransactionRepo.updateNobaAdmin(anything())).thenResolve(updatedNobaAdmin);

      const result = await adminService.updateNobaAdmin(ADMIN_ID, CHANGED_ROLE, CHANGED_NAME);
      const updateNobaAdminArgument: Admin = capture(mockAdminTransactionRepo.updateNobaAdmin).last()[0];

      expect(result).toBe(updatedNobaAdmin);
      expect(updateNobaAdminArgument.props).toEqual({
        _id: ADMIN_ID,
        email: ADMIN_EMAIL,
        name: CHANGED_NAME,
        role: CHANGED_ROLE,
      });
    });
  });

  describe("deleteNobaAdmin", () => {
    it("should throw 'NotFoundException' if user with given ID doesn't exists", async () => {
      const adminId = "1111111111";
      when(mockAdminTransactionRepo.deleteNobaAdmin(adminId)).thenResolve(0);

      try {
        await adminService.deleteNobaAdmin(adminId);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it("should delete the admin with given ID successfully", async () => {
      const adminId = "1111111111";
      when(mockAdminTransactionRepo.deleteNobaAdmin(adminId)).thenResolve(1);

      const result = await adminService.deleteNobaAdmin(adminId);

      expect(result).toBe(adminId);
    });
  });

  describe("getAdminByEmail", () => {
    it("should throw 'NotFoundException' if email doesn't exist", async () => {
      const NON_EXISTING_ADMIN_EMAIL = "abcd@noba.com";

      when(mockAdminTransactionRepo.getNobaAdminByEmail(NON_EXISTING_ADMIN_EMAIL)).thenReject(new NotFoundException());

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
        _id: "1111111111",
        name: "Admin",
        email: EXISTING_ADMIN_EMAIL,
        role: "INTERMEDIATE",
      });

      when(mockAdminTransactionRepo.getNobaAdminByEmail(EXISTING_ADMIN_EMAIL)).thenResolve(existingNobaAdmin);

      const result = await adminService.getAdminByEmail(EXISTING_ADMIN_EMAIL);
      expect(result).toEqual(existingNobaAdmin);
    });
  });

  describe("getAdminById", () => {
    it("should throw 'NotFoundException' if ID doesn't exist", async () => {
      const NON_EXISTING_ADMIN_ID = "1111111111";

      when(mockAdminTransactionRepo.getNobaAdminById(NON_EXISTING_ADMIN_ID)).thenReject(new NotFoundException());

      try {
        await adminService.getAdminById(NON_EXISTING_ADMIN_ID);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it("should successfully return an Admin with given ID", async () => {
      const EXISTING_ADMIN_ID = "1111111111";
      const existingNobaAdmin = Admin.createAdmin({
        _id: EXISTING_ADMIN_ID,
        name: "Admin",
        email: "abcd@noba.com",
        role: "INTERMEDIATE",
      });

      when(mockAdminTransactionRepo.getNobaAdminById(EXISTING_ADMIN_ID)).thenResolve(existingNobaAdmin);

      const result = await adminService.getAdminById(EXISTING_ADMIN_ID);
      expect(result).toEqual(existingNobaAdmin);
    });
  });
});
