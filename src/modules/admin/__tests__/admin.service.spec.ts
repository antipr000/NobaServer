import { TestingModule, Test } from "@nestjs/testing";
import { instance, when } from "ts-mockito";
import { AdminService } from "../admin.service";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { IAdminTransactionRepo } from "../repos/transactions/AdminTransactionRepo";
import { CommonModule } from '../../common/common.module';
import { Admin } from "../domain/Admin";
import { AdminController } from "../admin.controller";
import { AdminMapper } from "../mappers/AdminMapper";
import { getWinstonModule } from "../../../../src/core/utils/WinstonModule";
import { getMockAdminTransactionRepoWithDefaults } from "../mocks/MockAdminTransactionRepo";

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
});