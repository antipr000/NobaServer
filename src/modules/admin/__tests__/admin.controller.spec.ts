import { TestingModule, Test } from "@nestjs/testing";
import { anything, capture, instance, when } from "ts-mockito";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { AdminService } from "../admin.service";
import { Admin } from "../domain/Admin";
import { AdminController } from "../admin.controller";
import { AdminMapper } from "../mappers/AdminMapper";
import { NobaAdminDTO } from "../dto/NobaAdminDTO";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { OutputNobaAdminDTO } from "../dto/OutputNobaAdminDTO";
import { getMockAdminServiceWithDefaults } from "../mocks/MockAdminService";
import { UpdateNobaAdminDTO } from "../dto/UpdateNobaAdminDTO";
import { DeleteNobaAdminDTO } from "../dto/DeleteNobaAdminDTO";

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
                await adminController.createNobaAdmin("id", newNobaAdmin);
                expect(true).toBe(false);
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
                await adminController.createNobaAdmin("id", newNobaAdmin);
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

    describe('Update the role of a NobaAdmin', () => {
        it('should throw error if email doesn\'t exists.', async () => {
            const ADMIN_ID = "1111111111";
            when(mockAdminService.changeNobaAdminRole(ADMIN_ID, "INTERMEDIATE"))
                .thenReject(new NotFoundException());

            try {
                const request: UpdateNobaAdminDTO = {
                    _id: ADMIN_ID,
                    role: "INTERMEDIATE"
                };
                await adminController.updateNobaAdmin("id", request);
                expect(true).toBe(false);
            } catch (err) {
                expect(err).toBeInstanceOf(NotFoundException);
            }
        });

        it('should successfully update the role of the specified admin', async () => {
            const ADMIN_ID = "1111111111";
            const CURRENT_ROLE: string = "BASIC";
            const UPDATED_ROLE: string = "INTERMEDIATE";

            const updatedAdmin: Admin = Admin.createAdmin({
                _id: ADMIN_ID,
                name: "Admin",
                email: EXISTING_ADMIN_EMAIL,
                role: UPDATED_ROLE
            });
            when(mockAdminService.changeNobaAdminRole(ADMIN_ID, UPDATED_ROLE))
                .thenResolve(updatedAdmin);

            const request: UpdateNobaAdminDTO = {
                _id: ADMIN_ID,
                role: UPDATED_ROLE
            };
            const result = await adminController.updateNobaAdmin("id", request);

            expect(result).toEqual(updatedAdmin.props);
        });
    });

    describe('Delete a NobaAdmin with given ID', () => {
        it('should throw "NotFoundException" if user with ID doesn\'t exists', async () => {
            const adminId = "1111111111";
            when(mockAdminService.deleteNobaAdmin(adminId))
                .thenReject(new NotFoundException());

            try {
                const request: DeleteNobaAdminDTO = { _id: adminId };
                await adminController.deleteNobaAdmin("id", request);
                expect(true).toBe(false);
            } catch (err) {
                expect(err).toBeInstanceOf(NotFoundException);
            }
        });

        it('should delete the specified NobaAdmin & returns it\'s ID', async () => {
            const adminId = "1111111111";
            when(mockAdminService.deleteNobaAdmin(adminId))
                .thenResolve(adminId);

            const request: DeleteNobaAdminDTO = { _id: adminId };
            const result = await adminController.deleteNobaAdmin("id", request);

            expect(result).toEqual(request);
        });
    });
});