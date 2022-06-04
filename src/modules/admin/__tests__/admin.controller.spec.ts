import { TestingModule, Test } from "@nestjs/testing";
import { anything, capture, instance, when } from "ts-mockito";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { AdminService } from "../admin.service";
import { Admin } from "../domain/Admin";
import { AdminController } from "../admin.controller";
import { AdminMapper } from "../mappers/AdminMapper";
import { NobaAdminDTO } from "../dto/NobaAdminDTO";
import { ConflictException } from "@nestjs/common";
import { OutputNobaAdminDTO } from "../dto/OutputNobaAdminDTO";
import { getMockAdminServiceWithDefaults } from "../mocks/MockAdminService";

const EXISTING_ADMIN_EMAIL = "abc@noba.com";
const NEW_ADMIN_EMAIL = "xyz@noba.com";

describe('AdminController', () => {
    jest.setTimeout(2000);

    let adminController: AdminController;
    let mockAdminService: AdminService;

    beforeEach(async () => {
        process.env = {
            ...process.env,
            NODE_ENV: "development",
            CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs"
        };

        mockAdminService = getMockAdminServiceWithDefaults();

        const app: TestingModule = await Test.createTestingModule({
            imports: [
                getWinstonModule(),
                getAppConfigModule()
            ],
            controllers: [AdminController],
            providers: [
                {
                    provide: 'AdminService',
                    useFactory: () => instance(mockAdminService)
                },
                AdminMapper
            ],
        }).compile();

        adminController = app.get<AdminController>(AdminController);
    });

    describe('Creating a new NobaAdmin', () => {
        it('should return AlreadyExists error if email matches with an existing NobaAdmin', async () => {
            const newNobaAdmin: NobaAdminDTO = {
                email: EXISTING_ADMIN_EMAIL,
                role: 'BASIC',
                name: "Admin"
            };

            when(mockAdminService.addNobaAdmin(anything()))
                .thenResolve(undefined);

            try {
                const result = await adminController.createNobaAdmin(newNobaAdmin);
                expect(result).toBeUndefined();
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

            when(mockAdminService.addNobaAdmin(anything()))
                .thenResolve(Admin.createAdmin({
                    _id: "1111111111",
                    email: newNobaAdmin.email,
                    name: newNobaAdmin.name,
                    role: newNobaAdmin.role
                }));

            const result: OutputNobaAdminDTO =
                await adminController.createNobaAdmin(newNobaAdmin);
            const addNobaAdminArgument: Admin = capture(mockAdminService.addNobaAdmin).last()[0];

            expect(result._id).toBeDefined();
            expect(result.email).toEqual(newNobaAdmin.email);
            expect(result.name).toEqual(newNobaAdmin.name);
            expect(result.role).toEqual(newNobaAdmin.role);

            expect(addNobaAdminArgument.props.email).toEqual(newNobaAdmin.email);
            expect(addNobaAdminArgument.props.name).toEqual(newNobaAdmin.name);
            expect(addNobaAdminArgument.props.role).toEqual(newNobaAdmin.role);
        });
    });
});