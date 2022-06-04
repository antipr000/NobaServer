import { TestingModule, Test } from "@nestjs/testing";
import { anything, capture, instance, when } from "ts-mockito";
import { AdminService } from "../admin.service";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { IAdminTransactionRepo } from "../repos/transactions/AdminTransactionRepo";
import { CommonModule } from '../../common/common.module';
import { Admin } from "../domain/Admin";
import { AdminController } from "../admin.controller";
import { AdminMapper } from "../mappers/AdminMapper";
import { getWinstonModule } from "../../../../src/core/utils/WinstonModule";
import { getMockAdminTransactionRepoWithDefaults } from "../mocks/MockAdminTransactionRepo";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe('AdminService', () => {
  jest.setTimeout(5000);

  let mockAdminTransactionRepo: IAdminTransactionRepo;
  let adminService: AdminService;

  beforeEach(async () => {
    mockAdminTransactionRepo = getMockAdminTransactionRepoWithDefaults();

    process.env = {
      ...process.env,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs"
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        getWinstonModule(),
        getAppConfigModule(),
        CommonModule
      ],
      controllers: [AdminController],
      providers: [
        AdminService,
        {
          provide: 'AdminTransactionRepo',
          useFactory: () => instance(mockAdminTransactionRepo)
        },
        AdminMapper
      ],
    }).compile();

    adminService = app.get<AdminService>(AdminService);
  })

  describe('addNobaAdmin', () => {
    it('should return "undfined" if email already exists', async () => {
      const EXISTING_ADMIN_EMAIL = "abcd@noba.com";
      const existingNobaAdmin = Admin.createAdmin({
        _id: "1111111111",
        name: "Admin",
        email: EXISTING_ADMIN_EMAIL,
        role: "INTERMEDIATE"
      });

      when(mockAdminTransactionRepo.getNobaAdminByEmail(EXISTING_ADMIN_EMAIL))
        .thenResolve(existingNobaAdmin);

      const result = await adminService.addNobaAdmin(existingNobaAdmin);
      expect(result).toBeUndefined();
    });

    it('should creates a new Admin with the given email & role', async () => {
      const NEW_ADMIN_EMAIL = "xyz@noba.com";
      const newNobaAdmin = Admin.createAdmin({
        _id: "1111111112",
        name: "Admin 2",
        email: NEW_ADMIN_EMAIL,
        role: "INTERMEDIATE"
      });

      when(mockAdminTransactionRepo.getNobaAdminByEmail(NEW_ADMIN_EMAIL))
        .thenResolve(undefined);
      when(mockAdminTransactionRepo.addNobaAdmin(newNobaAdmin))
        .thenResolve(newNobaAdmin);

      const result = await adminService.addNobaAdmin(newNobaAdmin);
      expect(result).toStrictEqual(newNobaAdmin);
    });
  });


  describe('changeNobaAdminRole', () => {
    it('should throw "BadRequestException" if "role" is invalid', async () => {
      const invalidRole: string = "INVALID_ROLE";

      try {
        await adminService.changeNobaAdminRole("a@a.in", invalidRole);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw "NotFoundException" if admin with given email doesn\'t exist', async () => {
      const INVALID_EMAIL: string = "abc@noba.com";

      when(mockAdminTransactionRepo.getNobaAdminByEmail(INVALID_EMAIL))
        .thenResolve(undefined);

      try {
        await adminService.changeNobaAdminRole(INVALID_EMAIL, "BASIC");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('should successfully update the role to the new role', async () => {
      const VALID_EMAIL: string = "abc@noba.com";
      const CURRENT_ROLE: string = "BASIC";
      const CHANGED_ROLE: string = "INTERMEDIATE";

      const nobaAdmin: Admin = Admin.createAdmin({
        _id: "1111111111",
        email: VALID_EMAIL,
        name: "Admin",
        role: CURRENT_ROLE
      });
      const updatedNobaAdmin = Admin.createAdmin({
        _id: "1111111111",
        email: VALID_EMAIL,
        name: "Admin",
        role: CHANGED_ROLE
      });

      when(mockAdminTransactionRepo.getNobaAdminByEmail(VALID_EMAIL))
        .thenResolve(nobaAdmin);
      when(mockAdminTransactionRepo.updateNobaAdmin(anything()))
        .thenResolve(updatedNobaAdmin);

      const result = await adminService.changeNobaAdminRole(VALID_EMAIL, CHANGED_ROLE);
      const updateNobaAdminArgument: Admin =
        capture(mockAdminTransactionRepo.updateNobaAdmin).last()[0];

      expect(result).toBe(updatedNobaAdmin);
      expect(updateNobaAdminArgument.props).toEqual({
        _id: "1111111111",
        email: VALID_EMAIL,
        name: "Admin",
        role: CHANGED_ROLE
      });
    });

    it('should not call the db when the "role" if the target "role" is same as current', async () => {
      const VALID_EMAIL: string = "abc@noba.com";
      const CURRENT_ROLE: string = "BASIC";
      const CHANGED_ROLE: string = "BASIC";

      const nobaAdmin: Admin = Admin.createAdmin({
        _id: "1111111111",
        email: VALID_EMAIL,
        name: "Admin",
        role: CURRENT_ROLE
      });

      when(mockAdminTransactionRepo.getNobaAdminByEmail(VALID_EMAIL))
        .thenResolve(nobaAdmin);

      const result = await adminService.changeNobaAdminRole(VALID_EMAIL, CHANGED_ROLE);

      expect(result).toEqual(nobaAdmin);
    })
  });

  describe('deleteNobaAdmin', () => {
    it('should throw "NotFoundException" if user with given ID doesn\'t exists', async () => {
      const adminId = "1111111111";
      when(mockAdminTransactionRepo.deleteNobaAdmin(adminId))
        .thenResolve(0);

      try {
        await adminService.deleteNobaAdmin(adminId);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('should delete the admin with given ID successfully', async () => {
      const adminId = "1111111111";
      when(mockAdminTransactionRepo.deleteNobaAdmin(adminId))
        .thenResolve(1);

      const result = await adminService.deleteNobaAdmin(adminId);

      expect(result).toBe(adminId);
    })
  })
});