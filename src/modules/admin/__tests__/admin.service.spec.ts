import { TestingModule, Test } from "@nestjs/testing";
import { anything, capture, instance, when } from "ts-mockito";
import { AdminService } from "../admin.service";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IAdminRepo } from "../repos/transactions/sql.admin.repo";
import { Admin } from "../domain/Admin";
import { AdminMapper } from "../mappers/AdminMapper";
import { getTestWinstonModule } from "../../../../src/core/utils/WinstonModule";
import { getMockAdminRepoWithDefaults } from "../mocks/MockAdminRepo";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BadRequestError } from "../../../core/exception/CommonAppException";

describe("AdminService", () => {
  jest.setTimeout(5000);

  let adminRepo: IAdminRepo;
  let adminService: AdminService;

  beforeEach(async () => {
    adminRepo = getMockAdminRepoWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      providers: [
        AdminService,
        {
          provide: "AdminTransactionRepo",
          useFactory: () => instance(adminRepo),
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
});
