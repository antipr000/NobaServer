import { TestingModule, Test } from "@nestjs/testing";
import { anything, capture, deepEqual, instance, when } from "ts-mockito";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { AdminService } from "../admin.service";
import { Admin, NOBA_ADMIN_ROLE_TYPES } from "../domain/Admin";
import { AdminController } from "../admin.controller";
import { AdminMapper } from "../mappers/AdminMapper";
import { NobaAdminDTO } from "../dto/NobaAdminDTO";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { getMockAdminServiceWithDefaults } from "../mocks/MockAdminService";
import { UpdateNobaAdminDTO } from "../dto/UpdateNobaAdminDTO";
import { DeleteNobaAdminDTO } from "../dto/DeleteNobaAdminDTO";
import { PartnerAdmin, PARTNER_ADMIN_ROLE_TYPES } from "../../../../src/modules/partner/domain/PartnerAdmin";
import { Consumer, ConsumerProps } from "../../consumer/domain/Consumer";
import { PartnerAdminService } from "../../../../src/modules/partner/partneradmin.service";
import { getMockPartnerAdminServiceWithDefaults } from "../../../../src/modules/partner/mocks/mock.partner.admin.service";
import { AddPartnerAdminRequestDTO } from "../../../../src/modules/partner/dto/AddPartnerAdminRequestDTO";
import { PartnerService } from "../../partner/partner.service";
import { getMockPartnerServiceWithDefaults } from "../../partner/mocks/mock.partner.service";
import { Partner } from "../../partner/domain/Partner";
import { PartnerDTO } from "../../partner/dto/PartnerDTO";
import { UpdatePartnerAdminRequestDTO } from "../../../modules/partner/dto/UpdatePartnerAdminRequestDTO";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { KYCStatus, DocumentVerificationStatus } from "../../../modules/consumer/domain/VerificationStatus";
import { VerificationProviders } from "../../../modules/consumer/domain/VerificationData";
import { CreatePartnerRequestDTO } from "src/modules/partner/dto/CreatePartnerRequestDTO";

const EXISTING_ADMIN_EMAIL = "abc@noba.com";
const NEW_ADMIN_EMAIL = "xyz@noba.com";
const LOGGED_IN_ADMIN_EMAIL = "authenticated@noba.com";

describe("AdminController", () => {
  jest.setTimeout(2000);

  let adminController: AdminController;
  let mockAdminService: AdminService;
  let mockPartnerAdminService: PartnerAdminService;
  let mockPartnerService: PartnerService;
  let mockConsumerService: ConsumerService;

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };

    mockAdminService = getMockAdminServiceWithDefaults();
    mockPartnerAdminService = getMockPartnerAdminServiceWithDefaults();
    mockPartnerService = getMockPartnerServiceWithDefaults();
    mockConsumerService = getMockConsumerServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useFactory: () => instance(mockAdminService),
        },
        {
          provide: PartnerAdminService,
          useFactory: () => instance(mockPartnerAdminService),
        },
        {
          provide: PartnerService,
          useFactory: () => instance(mockPartnerService),
        },
        {
          provide: ConsumerService,
          useFactory: () => instance(mockConsumerService),
        },
        AdminMapper,
      ],
    }).compile();

    adminController = app.get<AdminController>(AdminController);
  });

  describe("createNobaAdmin", () => {
    it("Consumers shouldn't be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
        name: "Admin",
      };
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });

      try {
        await adminController.createNobaAdmin({ user: { entity: authenticatedConsumer } }, newNobaAdmin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with most priveged role shouldn't be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
        name: "Admin",
      };
      const authenticatedPartnerAdmin: PartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
        partnerId: "PPPPPPPPPP",
      });

      try {
        await adminController.createNobaAdmin({ user: { entity: authenticatedPartnerAdmin } }, newNobaAdmin);
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
        _id: "XXXXXXXXXX",
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
        _id: "XXXXXXXXXX",
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
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.addNobaAdmin(anything())).thenResolve(
        Admin.createAdmin({
          _id: "1111111111",
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

      expect(result._id).toBeDefined();
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
        _id: "XXXXXXXXXX",
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
        _id: "XXXXXXXXXX",
        email: "consumer@noba.com",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });

      try {
        await adminController.getNobaAdmin({ user: { entity: authenticatedConsumer } });
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("Logged-in PartnerAdmins shouldn't be able to call GET /admins", async () => {
      const authenticatedPartnerAdmin: PartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "XXXXXXXXXX",
        email: "partner.admin@noba.com",
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
        partnerId: "PPPPPPPPPP",
      });

      try {
        await adminController.getNobaAdmin({ user: { entity: authenticatedPartnerAdmin } });
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("Logged-in NobaAdmins should successfully get the details of NobaAdmin", async () => {
      const adminId = "XXXXXXXXXX";
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      const queriedNobaAdmin = await adminController.getNobaAdmin({ user: { entity: authenticatedNobaAdmin } });

      expect(queriedNobaAdmin._id).toBe(authenticatedNobaAdmin.props._id);
      expect(queriedNobaAdmin.email).toBe(authenticatedNobaAdmin.props.email);
      expect(queriedNobaAdmin.name).toBe(authenticatedNobaAdmin.props.name);
      expect(queriedNobaAdmin.role).toBe(authenticatedNobaAdmin.props.role);
    });
  });

  describe("updateNobaAdminPrivileges", () => {
    it("Consumer shouldn't be able to update the role of the an admin", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedConsumer } }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with most privileged role shouldn't be able to update the role of the an admin", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const authenticatedPartnerAdmin: PartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
        partnerId: "PPPPPPPPPP",
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedPartnerAdmin } }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to update the role of the an admin", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role shouldn't be able to update the role of the an admin", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'ADMIN' role should be able to update the role of the an admin", async () => {
      const TARGET_ADMIN_ID = "1111111111";
      const TARGET_ADMIN_EMAIL = "admin.to.update@noba.com";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const CURRENT_ROLE = NOBA_ADMIN_ROLE_TYPES.BASIC;

      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.getAdminById(TARGET_ADMIN_ID)).thenResolve(
        Admin.createAdmin({
          _id: TARGET_ADMIN_ID,
          name: "Admin",
          email: TARGET_ADMIN_EMAIL,
          role: CURRENT_ROLE,
        }),
      );

      when(mockAdminService.updateNobaAdmin(TARGET_ADMIN_ID, UPDATED_ROLE, "Admin")).thenResolve(
        Admin.createAdmin({
          _id: TARGET_ADMIN_ID,
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
        TARGET_ADMIN_ID,
        request,
      );

      expect(result).toEqual({
        _id: TARGET_ADMIN_ID,
        name: "Admin",
        email: TARGET_ADMIN_EMAIL,
        role: UPDATED_ROLE,
      });
    });

    it("NobaAdmin with 'ADMIN' role should be able to update the 'name' of the an admin", async () => {
      const TARGET_ADMIN_ID = "1111111111";
      const TARGET_ADMIN_EMAIL = "admin.to.update@noba.com";
      const UPDATED_NAME = "New Admin Name";
      const CURRENT_NAME = "Admin Name";

      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.getAdminById(TARGET_ADMIN_ID)).thenResolve(
        Admin.createAdmin({
          _id: TARGET_ADMIN_ID,
          name: CURRENT_NAME,
          email: TARGET_ADMIN_EMAIL,
          role: NOBA_ADMIN_ROLE_TYPES.BASIC,
        }),
      );

      when(mockAdminService.updateNobaAdmin(TARGET_ADMIN_ID, NOBA_ADMIN_ROLE_TYPES.BASIC, UPDATED_NAME)).thenResolve(
        Admin.createAdmin({
          _id: TARGET_ADMIN_ID,
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
        TARGET_ADMIN_ID,
        request,
      );

      expect(result).toEqual({
        _id: TARGET_ADMIN_ID,
        name: UPDATED_NAME,
        email: TARGET_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });
    });

    it("NobaAdmin with 'ADMIN' role should be able to update both 'name' & 'role' of the an admin", async () => {
      const TARGET_ADMIN_ID = "1111111111";
      const TARGET_ADMIN_EMAIL = "admin.to.update@noba.com";

      const UPDATED_NAME = "New Admin Name";
      const CURRENT_NAME = "Admin Name";
      const UPDATE_ROLE = NOBA_ADMIN_ROLE_TYPES.BASIC;
      const CURRENT_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;

      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.getAdminById(TARGET_ADMIN_ID)).thenResolve(
        Admin.createAdmin({
          _id: TARGET_ADMIN_ID,
          name: CURRENT_NAME,
          email: TARGET_ADMIN_EMAIL,
          role: CURRENT_ROLE,
        }),
      );

      when(mockAdminService.updateNobaAdmin(TARGET_ADMIN_ID, UPDATE_ROLE, UPDATED_NAME)).thenResolve(
        Admin.createAdmin({
          _id: TARGET_ADMIN_ID,
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
        TARGET_ADMIN_ID,
        request,
      );

      expect(result).toEqual({
        _id: TARGET_ADMIN_ID,
        name: UPDATED_NAME,
        email: TARGET_ADMIN_EMAIL,
        role: UPDATE_ROLE,
      });
    });

    it("NobaAdmin shouldn't be able to update it's own role", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE;
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: ADMIN_ID,
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw 'NotFoundException' error if AdminId doesn't exists.", async () => {
      const ADMIN_ID = "1111111111";
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockAdminService.getAdminById(ADMIN_ID)).thenReject(new NotFoundException());

      try {
        const request: UpdateNobaAdminDTO = {
          role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
        };
        await adminController.updateNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe("deleteNobaAdmin", () => {
    it("Consumers shouldn't be able to delete any NobaAdmin", async () => {
      const authenticatedConsumer: Consumer = Consumer.createConsumer({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });
      try {
        await adminController.deleteNobaAdmin({ user: { entity: authenticatedConsumer } }, "id");
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with 'most' privileged role shouldn't be able to delete any NobaAdmin", async () => {
      const authenticatedPartnerAdmin: PartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
        partnerId: "PPPPPPPPPP",
      });

      try {
        await adminController.deleteNobaAdmin({ user: { entity: authenticatedPartnerAdmin } }, "id");
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to delete any NobaAdmin", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
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
        _id: "XXXXXXXXXX",
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
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const adminId = "1111111111";
      when(mockAdminService.deleteNobaAdmin(adminId)).thenResolve(adminId);

      const result: DeleteNobaAdminDTO = await adminController.deleteNobaAdmin(
        { user: { entity: authenticatedNobaAdmin } },
        adminId,
      );

      expect(result._id).toEqual(adminId);
    });

    it("should throw 'NotFoundException' if user with ID doesn't exists", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const adminId = "1111111111";
      when(mockAdminService.deleteNobaAdmin(adminId)).thenReject(new NotFoundException());

      try {
        await adminController.deleteNobaAdmin({ user: { entity: authenticatedNobaAdmin } }, adminId);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it("NobaAdmin shouldn't be able to delete it's own account", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      try {
        await adminController.deleteNobaAdmin(
          { user: { entity: authenticatedNobaAdmin } },
          authenticatedNobaAdmin.props._id,
        );
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe("addAdminsForPartners", () => {
    it("Consumers shouldn't be able to create a new PartnerAdmin", async () => {
      const consumerId = "CCCCCCCCCC";
      const partnerId = "PPPPPPPPPP";
      const newPartnerAdminEmail = "partner.admin@noba.com";

      const requestingConsumer = Consumer.createConsumer({
        _id: consumerId,
        email: "consumer@noba.com",
        firstName: "Consumer A",
        lastName: "Last Name",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });

      const addPartnerAdminRequest: AddPartnerAdminRequestDTO = {
        email: newPartnerAdminEmail,
        name: "Partner Admin A",
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
      };

      try {
        await adminController.addAdminsForPartners(partnerId, addPartnerAdminRequest, {
          user: { entity: requestingConsumer },
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with 'ALL' privileges shouldn't be able to create a new PartnerAdmin using ADMIN API", async () => {
      const partnerAdminId = "PAPAPAPAPPA";
      const partnerId = "PPPPPPPPPP";
      const newPartnerAdminEmail = "partner.admin@noba.com";

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminId,
        email: "partner.admin@noba.com",
        name: "Partner Admin",
        partnerId: partnerId,
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
      });

      const addPartnerAdminRequest: AddPartnerAdminRequestDTO = {
        email: newPartnerAdminEmail,
        name: "Partner Admin A",
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
      };

      try {
        await adminController.addAdminsForPartners(partnerId, addPartnerAdminRequest, {
          user: { entity: requestingPartnerAdmin },
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to create a new PartnerAdmin", async () => {
      const adminId = "AAAAAAAAAA";
      const partnerId = "PPPPPPPPPP";
      const newPartnerAdminEmail = "partner.admin@noba.com";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      const addPartnerAdminRequest: AddPartnerAdminRequestDTO = {
        email: newPartnerAdminEmail,
        name: "Partner Admin A",
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
      };

      try {
        await adminController.addAdminsForPartners(partnerId, addPartnerAdminRequest, {
          user: { entity: requestingNobaAdmin },
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role should be able to create a new PartnerAdmin", async () => {
      const partnerId = "PPPPPPPPPP";
      const newPartnerAdminEmail = "partner.admin@noba.com";
      const newPartnerAdminName = "Partner Admin A";
      const newPartnerAdminRole = PARTNER_ADMIN_ROLE_TYPES.ALL;

      const requestingNobaAdmin = Admin.createAdmin({
        _id: "AAAAAAAAAA",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      when(
        mockPartnerAdminService.addAdminForPartner(
          partnerId,
          newPartnerAdminEmail,
          newPartnerAdminName,
          newPartnerAdminRole,
        ),
      ).thenResolve(
        PartnerAdmin.createPartnerAdmin({
          _id: "PAPAPAPAPA",
          email: newPartnerAdminEmail,
          role: newPartnerAdminRole,
          partnerId: partnerId,
          name: newPartnerAdminName,
        }),
      );

      const addPartnerAdminRequest: AddPartnerAdminRequestDTO = {
        email: newPartnerAdminEmail,
        name: newPartnerAdminName,
        role: newPartnerAdminRole,
      };
      const result = await adminController.addAdminsForPartners(partnerId, addPartnerAdminRequest, {
        user: { entity: requestingNobaAdmin },
      });

      expect(result).toEqual({
        _id: "PAPAPAPAPA",
        email: newPartnerAdminEmail,
        role: newPartnerAdminRole,
        partnerID: partnerId,
        name: newPartnerAdminName,
      });
    });

    it("NobaAdmin with 'ADMIN' role should be able to create a new PartnerAdmin", async () => {
      const adminId = "AAAAAAAAAA";

      const partnerId = "PPPPPPPPPP";
      const newPartnerAdminEmail = "partner.admin@noba.com";
      const newPartnerAdminName = "Partner Admin A";
      const newPartnerAdminRole = PARTNER_ADMIN_ROLE_TYPES.ALL;

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      when(
        mockPartnerAdminService.addAdminForPartner(
          partnerId,
          newPartnerAdminEmail,
          newPartnerAdminName,
          newPartnerAdminRole,
        ),
      ).thenResolve(
        PartnerAdmin.createPartnerAdmin({
          _id: "PAPAPAPAPA",
          email: newPartnerAdminEmail,
          role: newPartnerAdminRole,
          partnerId: partnerId,
          name: newPartnerAdminName,
        }),
      );

      const addPartnerAdminRequest: AddPartnerAdminRequestDTO = {
        email: newPartnerAdminEmail,
        name: newPartnerAdminName,
        role: newPartnerAdminRole,
      };
      const result = await adminController.addAdminsForPartners(partnerId, addPartnerAdminRequest, {
        user: { entity: requestingNobaAdmin },
      });

      expect(result).toEqual({
        _id: "PAPAPAPAPA",
        email: newPartnerAdminEmail,
        role: newPartnerAdminRole,
        partnerID: partnerId,
        name: newPartnerAdminName,
      });
    });
  });

  describe("deleteAdminsForPartners", () => {
    it("Consumers shouldn't be able to delete a PartnerAdmin", async () => {
      const consumerId = "CCCCCCCCCC";
      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "partner.admin@noba.com";

      const requestingConsumer = Consumer.createConsumer({
        _id: consumerId,
        email: "consumer@noba.com",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });

      try {
        await adminController.deleteAdminsForPartners(partnerId, partnerAdminId, {
          user: { entity: requestingConsumer },
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with 'ALL' privileges shouldn't be able to delete a PartnerAdmin using ADMIN API", async () => {
      const partnerAdminId = "AAAAAAAAAAA";
      const partnerId = "PPPPPPPPPP";

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "PAPAPAPAPPA",
        email: "partner.admin@noba.com",
        name: "Partner Admin",
        partnerId: partnerId,
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
      });

      try {
        await adminController.deleteAdminsForPartners(partnerId, partnerAdminId, {
          user: { entity: requestingPartnerAdmin },
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to delete a PartnerAdmin", async () => {
      const adminId = "AAAAAAAAAA";
      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "PAPAPAPAPAPA";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      try {
        await adminController.deleteAdminsForPartners(partnerId, partnerAdminId, {
          user: { entity: requestingNobaAdmin },
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role should be able to create a new PartnerAdmin", async () => {
      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "PAPAPAPAPAPA";
      const partnerAdminEmail = "partner.admin@noba.com";
      const partnerAdminName = "Partner Admin A";
      const partnerAdminRole = PARTNER_ADMIN_ROLE_TYPES.ALL;

      const requestingNobaAdmin = Admin.createAdmin({
        _id: "AAAAAAAAAA",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      when(mockPartnerAdminService.deleteAdminForPartner(partnerId, partnerAdminId)).thenResolve(
        PartnerAdmin.createPartnerAdmin({
          _id: partnerAdminId,
          email: partnerAdminEmail,
          role: partnerAdminRole,
          partnerId: partnerId,
          name: partnerAdminName,
        }),
      );

      const result = await adminController.deleteAdminsForPartners(partnerId, partnerAdminId, {
        user: { entity: requestingNobaAdmin },
      });

      expect(result).toEqual({
        _id: partnerAdminId,
        email: partnerAdminEmail,
        role: partnerAdminRole,
        partnerID: partnerId,
        name: partnerAdminName,
      });
    });

    it("NobaAdmin with 'ADMIN' role should be able to create a new PartnerAdmin", async () => {
      const adminId = "AAAAAAAAAA";

      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "PAPAPAPAPAPA";
      const partnerAdminEmail = "partner.admin@noba.com";
      const partnerAdminName = "Partner Admin A";
      const partnerAdminRole = PARTNER_ADMIN_ROLE_TYPES.ALL;

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      when(mockPartnerAdminService.deleteAdminForPartner(partnerId, partnerAdminId)).thenResolve(
        PartnerAdmin.createPartnerAdmin({
          _id: partnerAdminId,
          email: partnerAdminEmail,
          role: partnerAdminRole,
          partnerId: partnerId,
          name: partnerAdminName,
        }),
      );

      const result = await adminController.deleteAdminsForPartners(partnerId, partnerAdminId, {
        user: { entity: requestingNobaAdmin },
      });

      expect(result).toEqual({
        _id: partnerAdminId,
        email: partnerAdminEmail,
        role: partnerAdminRole,
        partnerID: partnerId,
        name: partnerAdminName,
      });
    });

    it("should throw 'NotFoundException' if given PartnerAdminId exists with some other PartnerId", async () => {
      const adminId = "AAAAAAAAAA";
      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "PAPAPAPAPAPA";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      when(mockPartnerAdminService.deleteAdminForPartner(partnerId, partnerAdminId)).thenReject(
        new NotFoundException(),
      );

      try {
        await adminController.deleteAdminsForPartners(partnerId, partnerAdminId, {
          user: { entity: requestingNobaAdmin },
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe("updateAdminsForPartners", () => {
    it("Consumers shouldn't be able to update a PartnerAdmin", async () => {
      const consumerId = "CCCCCCCCCC";
      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "partner.admin@noba.com";

      const requestingConsumer = Consumer.createConsumer({
        _id: consumerId,
        email: "consumer@noba.com",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });

      try {
        const updatePartnerAdminRequest: UpdatePartnerAdminRequestDTO = {
          name: "New Admin",
          role: PARTNER_ADMIN_ROLE_TYPES.ALL,
        };
        await adminController.updateAdminForPartners(partnerId, partnerAdminId, updatePartnerAdminRequest, {
          user: { entity: requestingConsumer },
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with 'ALL' privileges shouldn't be able to update a PartnerAdmin using ADMIN API", async () => {
      const partnerAdminId = "AAAAAAAAAAA";
      const partnerId = "PPPPPPPPPP";

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "PAPAPAPAPPA",
        email: "partner.admin@noba.com",
        name: "Partner Admin",
        partnerId: partnerId,
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
      });

      try {
        const updatePartnerAdminRequest: UpdatePartnerAdminRequestDTO = {
          name: "New Admin",
          role: PARTNER_ADMIN_ROLE_TYPES.ALL,
        };
        await adminController.updateAdminForPartners(partnerId, partnerAdminId, updatePartnerAdminRequest, {
          user: { entity: requestingPartnerAdmin },
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to update a PartnerAdmin", async () => {
      const adminId = "AAAAAAAAAA";
      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "PAPAPAPAPAPA";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      try {
        const updatePartnerAdminRequest: UpdatePartnerAdminRequestDTO = {
          name: "New Admin",
          role: PARTNER_ADMIN_ROLE_TYPES.ALL,
        };
        await adminController.updateAdminForPartners(partnerId, partnerAdminId, updatePartnerAdminRequest, {
          user: { entity: requestingNobaAdmin },
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role should be able to update a PartnerAdmin", async () => {
      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "PAPAPAPAPAPA";
      const partnerAdminEmail = "partner.admin@noba.com";
      const partnerAdminNewName = "New Partner Admin";
      const partnerAdminNewRole = NOBA_ADMIN_ROLE_TYPES.BASIC;

      const requestingNobaAdmin = Admin.createAdmin({
        _id: "AAAAAAAAAA",
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      const updatePartnerAdminRequest: UpdatePartnerAdminRequestDTO = {
        name: partnerAdminNewName,
        role: partnerAdminNewRole,
      };
      when(
        mockPartnerAdminService.updateAdminForPartner(partnerId, partnerAdminId, updatePartnerAdminRequest),
      ).thenResolve(
        PartnerAdmin.createPartnerAdmin({
          _id: partnerAdminId,
          email: partnerAdminEmail,
          role: partnerAdminNewRole,
          partnerId: partnerId,
          name: partnerAdminNewName,
        }),
      );

      const result = await adminController.updateAdminForPartners(
        partnerId,
        partnerAdminId,
        updatePartnerAdminRequest,
        {
          user: {
            entity: requestingNobaAdmin,
          },
        },
      );

      expect(result).toEqual({
        _id: partnerAdminId,
        email: partnerAdminEmail,
        role: partnerAdminNewRole,
        partnerID: partnerId,
        name: partnerAdminNewName,
      });
    });

    it("NobaAdmin with 'ADMIN' role should be able to update a PartnerAdmin", async () => {
      const adminId = "AAAAAAAAAA";

      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "PAPAPAPAPAPA";
      const partnerAdminEmail = "partner.admin@noba.com";
      const partnerAdminNewName = "New Partner Admin";
      const partnerAdminNewRole = NOBA_ADMIN_ROLE_TYPES.BASIC;

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      const updatePartnerAdminRequest: UpdatePartnerAdminRequestDTO = {
        name: partnerAdminNewName,
        role: partnerAdminNewRole,
      };
      when(
        mockPartnerAdminService.updateAdminForPartner(partnerId, partnerAdminId, updatePartnerAdminRequest),
      ).thenResolve(
        PartnerAdmin.createPartnerAdmin({
          _id: partnerAdminId,
          email: partnerAdminEmail,
          role: partnerAdminNewRole,
          partnerId: partnerId,
          name: partnerAdminNewName,
        }),
      );

      const result = await adminController.updateAdminForPartners(
        partnerId,
        partnerAdminId,
        updatePartnerAdminRequest,
        {
          user: {
            entity: requestingNobaAdmin,
          },
        },
      );

      expect(result).toEqual({
        _id: partnerAdminId,
        email: partnerAdminEmail,
        role: partnerAdminNewRole,
        partnerID: partnerId,
        name: partnerAdminNewName,
      });
    });

    it("should throw 'NotFoundException' if given PartnerAdminId exists with some other PartnerId", async () => {
      const adminId = "AAAAAAAAAA";
      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "PAPAPAPAPAPA";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      when(mockPartnerAdminService.updateAdminForPartner(partnerId, partnerAdminId, anything())).thenReject(
        new NotFoundException(),
      );

      try {
        await adminController.updateAdminForPartners(
          partnerId,
          partnerAdminId,
          {},
          { user: { entity: requestingNobaAdmin } },
        );

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe("registerPartner", () => {
    it("Consumers shouldn't be able to register a new Partner", async () => {
      const consumerId = "CCCCCCCCCC";
      const newPartnerName = "Noba Partner";

      const requestingConsumer = Consumer.createConsumer({
        _id: consumerId,
        email: "consumer@noba.com",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });

      try {
        const addPartnerRequest: CreatePartnerRequestDTO = {
          name: newPartnerName,
          allowedCryptoCurrencies: ["ETH", "USDC"],
        };
        await adminController.registerPartner(addPartnerRequest, { user: { entity: requestingConsumer } });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with 'ALL' privileges shouldn't be able to register a new Partner", async () => {
      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "PAPAPAPAPA";
      const newPartnerName = "Noba Partner";

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminId,
        email: "partner.admin@noba.com",
        name: "Partner Admin",
        partnerId: partnerId,
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
      });

      try {
        const addPartnerRequest: CreatePartnerRequestDTO = {
          name: newPartnerName,
          allowedCryptoCurrencies: ["ETH", "USDC"],
        };
        await adminController.registerPartner(addPartnerRequest, { user: { entity: requestingPartnerAdmin } });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to register a new Partner", async () => {
      const adminId = "AAAAAAAAAA";
      const newPartnerName = "Noba Partner";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.BASIC,
      });

      try {
        const addPartnerRequest: CreatePartnerRequestDTO = {
          name: newPartnerName,
          allowedCryptoCurrencies: ["ETH", "USDC"],
        };
        await adminController.registerPartner(addPartnerRequest, { user: { entity: requestingNobaAdmin } });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role should be able to register a new Partner", async () => {
      const adminId = "AAAAAAAAAA";
      const createdPartnerId = "PPPPPPPPPP";
      const newPartnerName = "Noba Partner";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.INTERMEDIATE,
      });

      when(mockPartnerService.createPartner(anything())).thenResolve(
        Partner.createPartner({
          _id: createdPartnerId,
          name: newPartnerName,
          config: {
            cryptocurrencyAllowList: ["ETH", "USDC"],
            fees: {} as any,
            notificationConfig: [],
          },
        }),
      );

      const addPartnerRequest: CreatePartnerRequestDTO = {
        name: newPartnerName,
        allowedCryptoCurrencies: ["ETH", "USDC"],
      };
      const result: PartnerDTO = await adminController.registerPartner(addPartnerRequest, {
        user: {
          entity: requestingNobaAdmin,
        },
      });

      expect(result._id).toBe(createdPartnerId);
      expect(result.name).toBe(newPartnerName);
      expect(result.apiKey).toHaveLength(32);
      expect(result.secretKey).toHaveLength(88);
      expect(result.apiKey).not.toEqual(result.secretKey);
    });

    it("NobaAdmin with 'ADMIN' role should be able to register a new Partner", async () => {
      const adminId = "AAAAAAAAAA";
      const createdPartnerId = "PPPPPPPPPP";
      const newPartnerName = "Noba Partner";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockPartnerService.createPartner(anything())).thenResolve(
        Partner.createPartner({
          _id: createdPartnerId,
          name: newPartnerName,
          config: {
            cryptocurrencyAllowList: ["ETH", "USDC"],
            fees: {} as any,
            notificationConfig: [],
          },
        }),
      );

      const addPartnerRequest: CreatePartnerRequestDTO = {
        name: newPartnerName,
        allowedCryptoCurrencies: ["ETH", "USDC"],
      };
      const result: PartnerDTO = await adminController.registerPartner(addPartnerRequest, {
        user: {
          entity: requestingNobaAdmin,
        },
      });

      expect(result._id).toBe(createdPartnerId);
      expect(result.name).toBe(newPartnerName);
      expect(result.apiKey).toHaveLength(32);
      expect(result.secretKey).toHaveLength(88);
      expect(result.apiKey).not.toEqual(result.secretKey);
    });

    it("NobaAdmin with 'ADMIN' role registers a new Partner with proper params", async () => {
      const adminId = "AAAAAAAAAA";
      const createdPartnerId = "PPPPPPPPPP";
      const newPartnerName = "Noba Partner";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      when(mockPartnerService.createPartner(anything())).thenResolve(
        Partner.createPartner({
          _id: createdPartnerId,
          name: newPartnerName,
          config: {
            cryptocurrencyAllowList: ["ETH", "USDC"],
            fees: {} as any,
            notificationConfig: [],
          },
        }),
      );

      const addPartnerRequest: CreatePartnerRequestDTO = {
        name: newPartnerName,
        allowedCryptoCurrencies: ["ETH", "USDC"],
        bypassWalletOtp: true,
        keepWalletsPrivate: true,
        makeOtherPartnerWalletsVisible: false,
        creditCardFeeDiscountPercent: 1,
        networkFeeDiscountPercent: 2,
        nobaFeeDiscountPercent: 3,
        processingFeeDiscountPercent: 4,
        spreadDiscountPercent: 5,
      };
      await adminController.registerPartner(addPartnerRequest, {
        user: {
          entity: requestingNobaAdmin,
        },
      });

      const [savePartnerRequest] = capture(mockPartnerService.createPartner).last();
      expect(savePartnerRequest.name).toBe(newPartnerName);
      expect(savePartnerRequest.allowedCryptoCurrencies).toStrictEqual(["ETH", "USDC"]);
      expect(savePartnerRequest.bypassWalletOtp).toBe(true);
      expect(savePartnerRequest.keepWalletsPrivate).toBe(true);
      expect(savePartnerRequest.makeOtherPartnerWalletsVisible).toBe(false);
      expect(savePartnerRequest.creditCardFeeDiscountPercent).toBe(1);
      expect(savePartnerRequest.networkFeeDiscountPercent).toBe(2);
      expect(savePartnerRequest.nobaFeeDiscountPercent).toBe(3);
      expect(savePartnerRequest.processingFeeDiscountPercent).toBe(4);
      expect(savePartnerRequest.spreadDiscountPercent).toBe(5);
    });

    it("NobaAdmin with 'Admin' role should be able to update consumer details", async () => {
      const adminId = "AAAAAAAAAA";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: adminId,
        email: "admin@noba.com",
        role: NOBA_ADMIN_ROLE_TYPES.ADMIN,
      });

      const consumerProps: ConsumerProps = {
        _id: "test-consumer-1234",
        email: "consumer@noba.com",
        verificationData: {
          kycVerificationStatus: KYCStatus.FLAGGED,
          documentVerificationStatus: DocumentVerificationStatus.PENDING,
          verificationProvider: VerificationProviders.SARDINE,
        },
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      };

      const updatedConsumerProps: ConsumerProps = {
        _id: "test-consumer-1234",
        email: "consumer@noba.com",
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          verificationProvider: VerificationProviders.SARDINE,
        },
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      };

      when(mockConsumerService.getConsumer(consumerProps._id)).thenResolve(Consumer.createConsumer(consumerProps));

      when(mockConsumerService.updateConsumer(deepEqual(updatedConsumerProps))).thenResolve(
        Consumer.createConsumer(updatedConsumerProps),
      );

      const result = await adminController.updateConsumer(
        consumerProps._id,
        {
          verificationData: {
            kycVerificationStatus: KYCStatus.APPROVED,
            documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          },
        },
        {
          user: { entity: requestingNobaAdmin },
        },
      );

      expect(result._id).toBe(consumerProps._id);
      expect(result.kycVerificationData.kycVerificationStatus).toBe(
        updatedConsumerProps.verificationData.kycVerificationStatus,
      );
      expect(result.documentVerificationData.documentVerificationStatus).toBe(
        updatedConsumerProps.verificationData.documentVerificationStatus,
      );
    });
  });
});
