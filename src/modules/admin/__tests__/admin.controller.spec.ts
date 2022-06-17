import { TestingModule, Test } from "@nestjs/testing";
import { anything, capture, instance, when } from "ts-mockito";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { AdminService } from "../admin.service";
import { Admin } from "../domain/Admin";
import { AdminController } from "../admin.controller";
import { AdminMapper } from "../mappers/AdminMapper";
import { NobaAdminDTO } from "../dto/NobaAdminDTO";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { OutputNobaAdminDTO } from "../dto/OutputNobaAdminDTO";
import { getMockAdminServiceWithDefaults } from "../mocks/MockAdminService";
import { UpdateNobaAdminDTO } from "../dto/UpdateNobaAdminDTO";
import { DeleteNobaAdminDTO } from "../dto/DeleteNobaAdminDTO";
import { PartnerAdmin } from "../../../../src/modules/partner/domain/PartnerAdmin";
import { User } from "../../../../src/modules/user/domain/User";
import { PartnerAdminService } from "../../../../src/modules/partner/partneradmin.service";
import { getMockPartnerAdminServiceWithDefaults } from "../../../../src/modules/partner/mocks/mock.partner.admin.service";
import { AddPartnerAdminRequestDTO } from "../../../../src/modules/partner/dto/AddPartnerAdminRequestDTO";
import { PartnerService } from "../../partner/partner.service";
import { getMockPartnerServiceWithDefaults } from "../../partner/mocks/mock.partner.service";
import { AddPartnerRequestDTO } from "../dto/AddPartnerRequestDTO";
import { Partner } from "../../partner/domain/Partner";
import { PartnerDTO } from "../../partner/dto/PartnerDTO";

const EXISTING_ADMIN_EMAIL = "abc@noba.com";
const NEW_ADMIN_EMAIL = "xyz@noba.com";
const LOGGED_IN_ADMIN_EMAIL = "authenticated@noba.com";

describe("AdminController", () => {
  jest.setTimeout(2000);

  let adminController: AdminController;
  let mockAdminService: AdminService;
  let mockPartnerAdminService: PartnerAdminService;
  let mockPartnerService: PartnerService;

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };

    mockAdminService = getMockAdminServiceWithDefaults();
    mockPartnerAdminService = getMockPartnerAdminServiceWithDefaults();
    mockPartnerService = getMockPartnerServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [getWinstonModule(), getAppConfigModule()],
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
        AdminMapper,
      ],
    }).compile();

    adminController = app.get<AdminController>(AdminController);
  });

  describe("createNobaAdmin", () => {
    it("Consumers shouldn't be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: "BASIC",
        name: "Admin",
      };
      const authenticatedConsumer: User = User.createUser({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
      });

      try {
        await adminController.createNobaAdmin({ user: authenticatedConsumer }, newNobaAdmin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with most priveged role shouldn't be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: "BASIC",
        name: "Admin",
      };
      const authenticatedParterAdmin: PartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "ALL",
        partnerId: "PPPPPPPPPP",
      });

      try {
        await adminController.createNobaAdmin({ user: authenticatedParterAdmin }, newNobaAdmin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: "BASIC",
        name: "Admin",
      };
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "BASIC",
      });

      try {
        await adminController.createNobaAdmin({ user: authenticatedNobaAdmin }, newNobaAdmin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role shouldn't be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: "BASIC",
        name: "Admin",
      };
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "INTERMEDIATE",
      });

      try {
        await adminController.createNobaAdmin({ user: authenticatedNobaAdmin }, newNobaAdmin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'ADMIN' role should be able to create a new NobaAdmin", async () => {
      const newNobaAdmin: NobaAdminDTO = {
        email: NEW_ADMIN_EMAIL,
        role: "BASIC",
        name: "Admin",
      };
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "ADMIN",
      });

      when(mockAdminService.addNobaAdmin(anything())).thenResolve(
        Admin.createAdmin({
          _id: "1111111111",
          email: newNobaAdmin.email,
          name: newNobaAdmin.name,
          role: newNobaAdmin.role,
        }),
      );

      const result: OutputNobaAdminDTO = await adminController.createNobaAdmin(
        { user: authenticatedNobaAdmin },
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
        role: "BASIC",
        name: "Admin",
      };
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "ADMIN",
      });

      when(mockAdminService.addNobaAdmin(anything())).thenResolve(undefined);

      try {
        await adminController.createNobaAdmin({ user: authenticatedNobaAdmin }, newNobaAdmin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
      }
    });
  });

  describe("updateNobaAdminPrivileges", () => {
    it("Consumer shouldn't be able to update the role of the an admin", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = "INTERMEDIATE";
      const authenticatedConsumer: User = User.createUser({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: authenticatedConsumer }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with most privileged role shouldn't be able to update the role of the an admin", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = "INTERMEDIATE";
      const authenticatedParterAdmin: PartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "ALL",
        partnerId: "PPPPPPPPPP",
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: authenticatedParterAdmin }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to update the role of the an admin", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = "INTERMEDIATE";
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "BASIC",
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: authenticatedNobaAdmin }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role shouldn't be able to update the role of the an admin", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = "INTERMEDIATE";
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "INTERMEDIATE",
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: authenticatedNobaAdmin }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'ADMIN' role should be able to update the role of the an admin", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = "INTERMEDIATE";
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "ADMIN",
      });

      const updatedAdmin: Admin = Admin.createAdmin({
        _id: ADMIN_ID,
        name: "Admin",
        email: EXISTING_ADMIN_EMAIL,
        role: UPDATED_ROLE,
      });
      when(mockAdminService.changeNobaAdminRole(ADMIN_ID, UPDATED_ROLE)).thenResolve(updatedAdmin);

      const request: UpdateNobaAdminDTO = {
        role: UPDATED_ROLE,
      };
      const result = await adminController.updateNobaAdmin({ user: authenticatedNobaAdmin }, ADMIN_ID, request);

      expect(result).toEqual(updatedAdmin.props);
    });

    it("NobaAdmin shouldn't be able to update it's own role", async () => {
      const ADMIN_ID = "1111111111";
      const UPDATED_ROLE = "INTERMEDIATE";
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: ADMIN_ID,
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "ADMIN",
      });

      try {
        const request: UpdateNobaAdminDTO = {
          role: UPDATED_ROLE,
        };
        await adminController.updateNobaAdmin({ user: authenticatedNobaAdmin }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw error if email doesn't exists.", async () => {
      const ADMIN_ID = "1111111111";
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "ADMIN",
      });

      when(mockAdminService.changeNobaAdminRole(ADMIN_ID, "INTERMEDIATE")).thenReject(new NotFoundException());

      try {
        const request: UpdateNobaAdminDTO = {
          role: "INTERMEDIATE",
        };
        await adminController.updateNobaAdmin({ user: authenticatedNobaAdmin }, ADMIN_ID, request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe("deleteNobaAdmin", () => {
    it("Consumers shouldn't be able to delete any NobaAdmin", async () => {
      const authenticatedConsumer: User = User.createUser({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
      });
      try {
        await adminController.deleteNobaAdmin({ user: authenticatedConsumer }, "id");
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with 'most' privileged role shouldn't be able to delete any NobaAdmin", async () => {
      const authenticatedParterAdmin: PartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "ALL",
        partnerId: "PPPPPPPPPP",
      });

      try {
        await adminController.deleteNobaAdmin({ user: authenticatedParterAdmin }, "id");
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
        role: "BASIC",
      });

      try {
        await adminController.deleteNobaAdmin({ user: authenticatedNobaAdmin }, "id");
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
        role: "INTERMEDIATE",
      });

      try {
        await adminController.deleteNobaAdmin({ user: authenticatedNobaAdmin }, "id");
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
        role: "ADMIN",
      });

      const adminId = "1111111111";
      when(mockAdminService.deleteNobaAdmin(adminId)).thenResolve(adminId);

      const result: DeleteNobaAdminDTO = await adminController.deleteNobaAdmin(
        { user: authenticatedNobaAdmin },
        adminId,
      );

      expect(result._id).toEqual(adminId);
    });

    it("should throw 'NotFoundException' if user with ID doesn't exists", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "ADMIN",
      });

      const adminId = "1111111111";
      when(mockAdminService.deleteNobaAdmin(adminId)).thenReject(new NotFoundException());

      try {
        await adminController.deleteNobaAdmin({ user: authenticatedNobaAdmin }, adminId);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it("NobaAdmin shouldn't be able to delete it's own account", async () => {
      const authenticatedNobaAdmin: Admin = Admin.createAdmin({
        _id: "XXXXXXXXXX",
        email: LOGGED_IN_ADMIN_EMAIL,
        role: "BASIC",
      });

      try {
        await adminController.deleteNobaAdmin({ user: authenticatedNobaAdmin }, authenticatedNobaAdmin.props._id);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe("addPartnerAdmin", () => {
    it("Consumers shouldn't be able to create a new PartnerAdmin", async () => {
      const adminId = "AAAAAAAAAA";
      const consumerId = "CCCCCCCCCC";
      const partnerId = "PPPPPPPPPP";
      const newPartnerAdminEmail = "partner.admin@noba.com";

      const requestingConsumer = User.createUser({
        _id: consumerId,
        email: "consumer@noba.com",
        name: "Consumer A",
      });

      const addPartnerAdminRequest: AddPartnerAdminRequestDTO = {
        email: newPartnerAdminEmail,
      };

      try {
        await adminController.addAdminsForPartners(adminId, partnerId, addPartnerAdminRequest, {
          user: requestingConsumer,
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with 'ALL' privileges shouldn't be able to create a new PartnerAdmin using ADMIN API", async () => {
      const adminId = "AAAAAAAAAA";
      const partnerAdminId = "PAPAPAPAPPA";
      const partnerId = "PPPPPPPPPP";
      const newPartnerAdminEmail = "partner.admin@noba.com";

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminId,
        email: "partner.admin@noba.com",
        name: "Partner Admin",
        partnerId: partnerId,
        role: "ALL",
      });

      const addPartnerAdminRequest: AddPartnerAdminRequestDTO = {
        email: newPartnerAdminEmail,
      };

      try {
        await adminController.addAdminsForPartners(adminId, partnerId, addPartnerAdminRequest, {
          user: requestingPartnerAdmin,
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
        _id: "AAAAAAAAAA",
        email: "admin@noba.com",
        role: "BASIC",
      });

      const addPartnerAdminRequest: AddPartnerAdminRequestDTO = {
        email: newPartnerAdminEmail,
      };

      try {
        await adminController.addAdminsForPartners(adminId, partnerId, addPartnerAdminRequest, {
          user: requestingNobaAdmin,
        });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'INTERMEDIATE' role should be able to create a new PartnerAdmin", async () => {
      const adminId = "AAAAAAAAAA";
      const partnerId = "PPPPPPPPPP";
      const newPartnerAdminEmail = "partner.admin@noba.com";
      const requestingNobaAdmin = Admin.createAdmin({
        _id: "AAAAAAAAAA",
        email: "admin@noba.com",
        role: "INTERMEDIATE",
      });

      when(mockPartnerAdminService.addPartnerAdmin(partnerId, newPartnerAdminEmail)).thenResolve(
        PartnerAdmin.createPartnerAdmin({
          _id: "PAPAPAPAPA",
          email: newPartnerAdminEmail,
          role: "BASIC",
          partnerId: partnerId,
        }),
      );

      const addPartnerAdminRequest: AddPartnerAdminRequestDTO = {
        email: newPartnerAdminEmail,
      };
      const result = await adminController.addAdminsForPartners(adminId, partnerId, addPartnerAdminRequest, {
        user: requestingNobaAdmin,
      });

      expect(result).toEqual({
        _id: "PAPAPAPAPA",
        email: newPartnerAdminEmail,
        role: "BASIC",
        partnerId: partnerId,
      });
    });

    it("NobaAdmin with 'ADMIN' role should be able to create a new PartnerAdmin", async () => {
      const adminId = "AAAAAAAAAA";
      const partnerId = "PPPPPPPPPP";
      const newPartnerAdminEmail = "partner.admin@noba.com";
      const requestingNobaAdmin = Admin.createAdmin({
        _id: "AAAAAAAAAA",
        email: "admin@noba.com",
        role: "INTERMEDIATE",
      });

      when(mockPartnerAdminService.addPartnerAdmin(partnerId, newPartnerAdminEmail)).thenResolve(
        PartnerAdmin.createPartnerAdmin({
          _id: "PAPAPAPAPA",
          email: newPartnerAdminEmail,
          role: "BASIC",
          partnerId: partnerId,
        }),
      );

      const addPartnerAdminRequest: AddPartnerAdminRequestDTO = {
        email: newPartnerAdminEmail,
      };
      const result = await adminController.addAdminsForPartners(adminId, partnerId, addPartnerAdminRequest, {
        user: requestingNobaAdmin,
      });

      expect(result).toEqual({
        _id: "PAPAPAPAPA",
        email: newPartnerAdminEmail,
        role: "BASIC",
        partnerId: partnerId,
      });
    });
  });

  describe("registerPartner", () => {
    it("Consumers shouldn't be able to register a new Partner", async () => {
      const adminId = "AAAAAAAAAA";
      const consumerId = "CCCCCCCCCC";
      const newPartnerName = "Noba Partner";

      const requestingConsumer = User.createUser({
        _id: consumerId,
        email: "consumer@noba.com",
        name: "Consumer A",
      });

      try {
        const addPartnerRequest: AddPartnerRequestDTO = {
          name: newPartnerName,
        };
        await adminController.registerPartner(adminId, addPartnerRequest, { user: requestingConsumer });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("PartnerAdmin with 'ALL' privileges shouldn't be able to register a new Partner", async () => {
      const adminId = "AAAAAAAAAA";
      const partnerId = "PPPPPPPPPP";
      const partnerAdminId = "PAPAPAPAPA";
      const newPartnerName = "Noba Partner";

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminId,
        email: "partner.admin@noba.com",
        name: "Partner Admin",
        partnerId: partnerId,
        role: "ALL",
      });

      try {
        const addPartnerRequest: AddPartnerRequestDTO = {
          name: newPartnerName,
        };
        await adminController.registerPartner(adminId, addPartnerRequest, { user: requestingPartnerAdmin });

        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("NobaAdmin with 'BASIC' role shouldn't be able to register a new Partner", async () => {
      const adminId = "AAAAAAAAAA";
      const newPartnerName = "Noba Partner";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: "AAAAAAAAAA",
        email: "admin@noba.com",
        role: "BASIC",
      });

      try {
        const addPartnerRequest: AddPartnerRequestDTO = {
          name: newPartnerName,
        };
        await adminController.registerPartner(adminId, addPartnerRequest, { user: requestingNobaAdmin });

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
        _id: "AAAAAAAAAA",
        email: "admin@noba.com",
        role: "INTERMEDIATE",
      });

      when(mockPartnerService.createPartner(newPartnerName)).thenResolve(
        Partner.createPartner({
          _id: createdPartnerId,
          name: newPartnerName,
        }),
      );

      const addPartnerRequest: AddPartnerRequestDTO = {
        name: newPartnerName,
      };
      const result: PartnerDTO = await adminController.registerPartner(adminId, addPartnerRequest, {
        user: requestingNobaAdmin,
      });

      expect(result).toEqual({
        _id: createdPartnerId,
        name: newPartnerName,
      });
    });

    it("NobaAdmin with 'ADMIN' role should be able to register a new Partner", async () => {
      const adminId = "AAAAAAAAAA";
      const createdPartnerId = "PPPPPPPPPP";
      const newPartnerName = "Noba Partner";

      const requestingNobaAdmin = Admin.createAdmin({
        _id: "AAAAAAAAAA",
        email: "admin@noba.com",
        role: "ADMIN",
      });

      when(mockPartnerService.createPartner(newPartnerName)).thenResolve(
        Partner.createPartner({
          _id: createdPartnerId,
          name: newPartnerName,
        }),
      );

      const addPartnerRequest: AddPartnerRequestDTO = {
        name: newPartnerName,
      };
      const result: PartnerDTO = await adminController.registerPartner(adminId, addPartnerRequest, {
        user: requestingNobaAdmin,
      });

      expect(result).toEqual({
        _id: createdPartnerId,
        name: newPartnerName,
      });
    });
  });
});
