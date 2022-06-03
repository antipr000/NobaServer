import { TestingModule, Test } from "@nestjs/testing";
import { instance } from "ts-mockito";
import { AdminService } from "../admin.service";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { IAdminTransactionRepo } from "../repos/transactions/AdminTransactionRepo";
import { CommonModule } from '../../common/common.module';
import { Admin, AdminProps } from "../domain/Admin";
import { AdminController } from "../admin.controller";
import { TransactionStatsDTO } from "../dto/TransactionStats";
import { AdminMapper } from "../mappers/AdminMapper";
import { Transaction } from "../../transactions/domain/Transaction";
import { getWinstonModule } from "../../../../src/core/utils/WinstonModule";

const ADMIN_EMAIL = "abcd@noba.com";
const NEW_EMAIL = "xyz@noba.com";

class FakeAdminRepo implements IAdminTransactionRepo {
  getTransactionStats(): Promise<TransactionStatsDTO> {
    throw Error('Not implemented!');
  }

  getAllTransactions(startDate: string, endDate: string): Promise<Transaction[]> {
    throw Error('Not implemented!');
  }

  addNobaAdmin(nobaAdmin: Admin): Promise<Admin> {
    return new Promise((resolve, _) => {
      resolve(nobaAdmin);
    });
  }

  getNobaAdminByEmail(email: string): Promise<Admin> {
    if (email === ADMIN_EMAIL) {
      const adminProps: AdminProps = {
        _id: "1111111111",
        name: "Admin",
        email: ADMIN_EMAIL,
        role: "INTERMEDIATE"
      }

      return new Promise((resolve, _) => {
        resolve(Admin.createAdmin(adminProps));
      });
    }
    return new Promise((resolve, _) => {
      resolve(undefined);
    })
  }
};

describe('AdminService', () => {
  let adminService: AdminService;
  let adminRepo: IAdminTransactionRepo;

  jest.setTimeout(2000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
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
          useFactory: () => new FakeAdminRepo()
        },
        AdminMapper
      ],
    }).compile();

    adminService = app.get<AdminService>(AdminService);
    adminRepo = app.get<FakeAdminRepo>('AdminTransactionRepo');
  });

  describe('addNobaAdmin', () => {
    it('should return "undfined" if email already exists', async () => {
      const adminProps: AdminProps = {
        _id: "1111111111",
        name: "Admin",
        email: ADMIN_EMAIL,
        role: "INTERMEDIATE"
      }

      // expect(adminRepo.getNobaAdminByEmail).toBeCalledWith(ADMIN_EMAIL);
      const result = await adminService.addNobaAdmin(Admin.createAdmin(adminProps));
      expect(result).toBeUndefined();
    });

    it('should creates a new Admin with the given email & role', async () => {
      const adminProps: AdminProps = {
        _id: "1111111112",
        name: "Admin 2",
        email: NEW_EMAIL,
        role: "INTERMEDIATE"
      };
      const nobaAdmin = Admin.createAdmin(adminProps);

      // expect(adminRepo.getNobaAdminByEmail).toBeCalledWith(NEW_EMAIL);
      // expect(adminRepo.addNobaAdmin).toBeCalledWith(nobaAdmin);

      const result = await adminService.addNobaAdmin(nobaAdmin);
      expect(result).toStrictEqual(nobaAdmin);
    });
  });
});