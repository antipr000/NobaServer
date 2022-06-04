import { TestingModule, Test } from "@nestjs/testing";
import { instance } from "ts-mockito";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { AdminService } from "../admin.service";
import { TransactionStatsDTO } from "../dto/TransactionStats";
import { TransactionDTO } from "src/modules/transactions/dto/TransactionDTO";
import { Admin } from "../domain/Admin";
import { AdminController } from "../admin.controller";
import { AdminMapper } from "../mappers/AdminMapper";
import { NobaAdminDTO } from "../dto/NobaAdminDTO";
import { ConflictException } from "@nestjs/common";
import { OutputNobaAdminDTO } from "../dto/OutputNobaAdminDTO";

const EXISTING_ADMIN_EMAIL = "abc@noba.com";
const NEW_ADMIN_EMAIL = "xyz@noba.com";

class FakeAdminService extends AdminService {
    async getTransactionStatus(): Promise<TransactionStatsDTO> {
        throw Error('Not implemented!');
    }

    async getAllTransactions(startDate: string, endDate: string): Promise<TransactionDTO[]> {
        throw Error('Not implemented!');
    }

    async addNobaAdmin(nobaAdmin: Admin): Promise<Admin> {
        if (nobaAdmin.props.email === EXISTING_ADMIN_EMAIL)
            return undefined;
        if (nobaAdmin.props.email === NEW_ADMIN_EMAIL)
            return nobaAdmin;

        throw Error('Unrecognised email!');
    }
}

describe('AdminController', () => {
    let adminController: AdminController;
    let adminService: AdminService;

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
                getAppConfigModule()
            ],
            controllers: [AdminController],
            providers: [
                {
                    provide: 'AdminService',
                    useFactory: () => new FakeAdminService()
                },
                AdminMapper
            ],
        }).compile();

        adminController = app.get<AdminController>(AdminController);
        adminService = app.get<FakeAdminService>('AdminService');
    });

    describe('Creating a new NobaAdmin', () => {
        it('should return AlreadyExists error if email matches with an existing NobaAdmin', async () => {
            const newNobaAdmin: NobaAdminDTO = {
                email: EXISTING_ADMIN_EMAIL,
                role: 'BASIC',
                name: "Admin"
            };

            try {
                const result = await adminController.createNobaAdmin(newNobaAdmin);
            } catch (err) {
                expect(err).toBeInstanceOf(ConflictException);
            }
        });

        it('should create a new NobaAdmin', async () => {
            const newNobaAdmin: NobaAdminDTO = {
                email: NEW_ADMIN_EMAIL,
                role: 'BASIC',
                name: "Admin"
            };

            const result = await adminController.createNobaAdmin(newNobaAdmin);
            expect(result._id).toBeDefined();
            expect(result.email).toEqual(newNobaAdmin.email);
            expect(result.name).toEqual(newNobaAdmin.name);
            expect(result.role).toEqual(newNobaAdmin.role);
        });
    });
});