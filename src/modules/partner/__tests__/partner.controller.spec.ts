import { TestingModule, Test } from "@nestjs/testing";
import { instance, when } from "ts-mockito";
import { PartnerService } from "../partner.service";
import { getMockPartnerAdminServiceWithDefaults } from "../mocks/mock.partner.admin.service";
import { getMockPartnerServiceWithDefaults } from "../mocks/mock.partner.service";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { PartnerAdminService } from "../partneradmin.service";
import { PartnerMapper } from "../mappers/PartnerMapper";
import { PartnerAdminMapper } from "../mappers/PartnerAdminMapper";
import { PartnerController } from "../partner.controller";
import { PartnerAdmin } from "../domain/PartnerAdmin";
import { ForbiddenException } from "@nestjs/common";
import { Partner } from "../domain/Partner";

describe("PartnerController", () => {
  let partnerController: PartnerController;
  let partnerService: PartnerService;
  let partnerAdminService: PartnerAdminService;
  const partnerMapper: PartnerMapper = new PartnerMapper();
  const partnerAdminMapper: PartnerAdminMapper = new PartnerAdminMapper();

  jest.setTimeout(30000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };

    partnerService = getMockPartnerServiceWithDefaults();
    partnerAdminService = getMockPartnerAdminServiceWithDefaults();

    const PartnerServiceProvider = {
      provide: PartnerService,
      useFactory: () => instance(partnerService),
    };

    const PartnerAdminServiceProvider = {
      provide: PartnerAdminService,
      useFactory: () => instance(partnerAdminService),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [getWinstonModule(), getAppConfigModule()],
      controllers: [PartnerController],
      providers: [PartnerServiceProvider, PartnerAdminServiceProvider],
    }).compile();

    partnerController = app.get<PartnerController>(PartnerController);
  });

  describe("partner service tests", () => {
    it("should add admin when admin with all access requests", async () => {
      const partnerAdminToAdd = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });
      const mockRequest = {
        user: requestingPartnerAdmin,
      };

      when(
        partnerAdminService.addPartnerAdmin(partnerAdminToAdd.props.partnerId, partnerAdminToAdd.props.email),
      ).thenResolve(partnerAdminToAdd);

      const result = await partnerController.addPartnerAdmin(
        partnerAdminToAdd.props.partnerId,
        {
          email: partnerAdminToAdd.props.email,
        },
        mockRequest,
      );

      expect(result).toStrictEqual(partnerAdminMapper.toDTO(partnerAdminToAdd));
    });

    it("should throw error when admin with basic access adds user", async () => {
      const partnerAdminToAdd = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });
      const mockRequest = {
        user: requestingPartnerAdmin,
      };

      when(
        partnerAdminService.addPartnerAdmin(partnerAdminToAdd.props.partnerId, partnerAdminToAdd.props.email),
      ).thenResolve(partnerAdminToAdd);

      try {
        await partnerController.addPartnerAdmin(
          partnerAdminToAdd.props.partnerId,
          {
            email: partnerAdminToAdd.props.email,
          },
          mockRequest,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw error when admin with intermediate access adds user", async () => {
      const partnerAdminToAdd = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: "mock-partner-2",
        role: "INTERMEDIATE",
      });
      const mockRequest = {
        user: requestingPartnerAdmin,
      };

      when(
        partnerAdminService.addPartnerAdmin(partnerAdminToAdd.props.partnerId, partnerAdminToAdd.props.email),
      ).thenResolve(partnerAdminToAdd);

      try {
        await partnerController.addPartnerAdmin(
          partnerAdminToAdd.props.partnerId,
          {
            email: partnerAdminToAdd.props.email,
          },
          mockRequest,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should get data of requesting partner admin", async () => {
      const partnerId = "mock-partner-1";
      const partnerAdminAllAccessId = "mock-partner-admin-1";
      const partnerAdminBasicAccessId = "mock-partner-admin-2";
      const partnerAdminIntermediateAccessId = "mock-partner-admin-3";

      const allAccessAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminAllAccessId,
        email: "mock@partner.com",
        partnerId: partnerId,
        role: "ALL",
      });
      const basicAccessAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminBasicAccessId,
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "BASIC",
      });
      const intermediateAccessAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminIntermediateAccessId,
        email: "moc3k@partner.com",
        partnerId: partnerId,
        role: "INTERMEDIATE",
      });

      when(partnerAdminService.getPartnerAdmin(allAccessAdmin.props._id)).thenResolve(allAccessAdmin);
      when(partnerAdminService.getPartnerAdmin(basicAccessAdmin.props._id)).thenResolve(basicAccessAdmin);
      when(partnerAdminService.getPartnerAdmin(intermediateAccessAdmin.props._id)).thenResolve(intermediateAccessAdmin);

      const allAccessResult = await partnerController.getPartnerAdmin(partnerId, partnerAdminAllAccessId, {
        user: allAccessAdmin,
      });
      const basicAccessResult = await partnerController.getPartnerAdmin(partnerId, partnerAdminBasicAccessId, {
        user: basicAccessAdmin,
      });
      const intermediateAccessResult = await partnerController.getPartnerAdmin(
        partnerId,
        partnerAdminIntermediateAccessId,
        {
          user: intermediateAccessAdmin,
        },
      );

      expect(allAccessResult).toStrictEqual(partnerAdminMapper.toDTO(allAccessAdmin));
      expect(basicAccessResult).toStrictEqual(partnerAdminMapper.toDTO(basicAccessAdmin));
      expect(intermediateAccessResult).toStrictEqual(partnerAdminMapper.toDTO(intermediateAccessAdmin));
    });

    it("should get data of any admin with all access", async () => {
      const partnerId = "mock-partner-1";
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "BASIC",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partnerId,
        role: "ALL",
      });

      when(partnerAdminService.getPartnerAdmin(partnerAdmin.props._id)).thenResolve(partnerAdmin);

      const result = await partnerController.getPartnerAdmin(partnerId, partnerAdmin.props._id, {
        user: requestingPartnerAdmin,
      });

      expect(result).toStrictEqual(partnerAdminMapper.toDTO(partnerAdmin));
    });

    it("should throw error when getting data of a different admin with basic access", async () => {
      const partnerId = "mock-partner-1";
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partnerId,
        role: "ALL",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "BASIC",
      });

      when(partnerAdminService.getPartnerAdmin(partnerAdmin.props._id)).thenResolve(partnerAdmin);

      try {
        await partnerController.getPartnerAdmin(partnerId, partnerAdmin.props._id, {
          user: requestingPartnerAdmin,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw error when getting data of a different admin with intermediate access", async () => {
      const partnerId = "mock-partner-1";
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partnerId,
        role: "ALL",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "BASIC",
      });

      when(partnerAdminService.getPartnerAdmin(partnerAdmin.props._id)).thenResolve(partnerAdmin);

      try {
        await partnerController.getPartnerAdmin(partnerId, partnerAdmin.props._id, {
          user: requestingPartnerAdmin,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should get all admins when requesting user has all access", async () => {
      const partnerId = "mock-partner-1";
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partnerId,
        role: "ALL",
      });

      when(partnerAdminService.getAllPartnerAdmins(partnerId)).thenResolve([
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-1",
          email: "mock@partner.com",
          partnerId: partnerId,
          role: "ALL",
        }),
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "mock2@partner.com",
          partnerId: partnerId,
          role: "BASIC",
        }),
      ]);

      const result = await partnerController.getAllPartnerAdmins(partnerId, {
        user: requestingPartnerAdmin,
      });

      expect(result.length).toBe(2);
    });

    it("should throw error when admin with basic access tries getting all admins", async () => {
      const partnerId = "mock-partner-1";
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "BASIC",
      });

      when(partnerAdminService.getAllPartnerAdmins(partnerId)).thenResolve([
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-1",
          email: "mock@partner.com",
          partnerId: partnerId,
          role: "ALL",
        }),
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "mock2@partner.com",
          partnerId: partnerId,
          role: "BASIC",
        }),
      ]);

      try {
        await partnerController.getAllPartnerAdmins(partnerId, {
          user: requestingPartnerAdmin,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw error when admin with intermediate access tries getting all admins", async () => {
      const partnerId = "mock-partner-1";
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "INTERMEDIATE",
      });

      when(partnerAdminService.getAllPartnerAdmins(partnerId)).thenResolve([
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-1",
          email: "mock@partner.com",
          partnerId: partnerId,
          role: "ALL",
        }),
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "mock2@partner.com",
          partnerId: partnerId,
          role: "INTERMEDIATE",
        }),
      ]);

      try {
        await partnerController.getAllPartnerAdmins(partnerId, {
          user: requestingPartnerAdmin,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should get partner details", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        publicKey: "mockPublicKey",
        privateKey: "mockPrivateKey",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partner.props._id,
        role: "BASIC",
      });

      when(partnerService.getPartner(partner.props._id)).thenResolve(partner);

      const result = await partnerController.getPartner(partner.props._id, {
        user: requestingPartnerAdmin,
      });

      expect(result).toStrictEqual(partnerMapper.toDTO(partner));
    });

    it("should update partner details when requesting admin has all access", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        publicKey: "mockPublicKey",
        privateKey: "mockPrivateKey",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partner.props._id,
        role: "ALL",
      });

      const newTakeRate = 20;

      when(partnerService.updateTakeRate(partner.props._id, newTakeRate)).thenResolve(
        Partner.createPartner({
          ...partner.props,
          takeRate: newTakeRate,
        }),
      );

      const result = await partnerController.updateTakeRate(
        partner.props._id,
        {
          takeRate: newTakeRate,
        },
        {
          user: requestingPartnerAdmin,
        },
      );

      expect(result).toStrictEqual(
        partnerMapper.toDTO(
          Partner.createPartner({
            ...partner.props,
            takeRate: newTakeRate,
          }),
        ),
      );
    });

    it("throw error on update partner details when requesting admin has basic access", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        publicKey: "mockPublicKey",
        privateKey: "mockPrivateKey",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partner.props._id,
        role: "BASIC",
      });

      const newTakeRate = 20;

      when(partnerService.updateTakeRate(partner.props._id, newTakeRate)).thenResolve(
        Partner.createPartner({
          ...partner.props,
          takeRate: newTakeRate,
        }),
      );

      try {
        await partnerController.updateTakeRate(
          partner.props._id,
          {
            takeRate: newTakeRate,
          },
          {
            user: requestingPartnerAdmin,
          },
        );
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("throw error on update partner details when requesting admin has intermediate access", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        publicKey: "mockPublicKey",
        privateKey: "mockPrivateKey",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partner.props._id,
        role: "INTERMEDIATE",
      });

      const newTakeRate = 20;

      when(partnerService.updateTakeRate(partner.props._id, newTakeRate)).thenResolve(
        Partner.createPartner({
          ...partner.props,
          takeRate: newTakeRate,
        }),
      );
      try {
        await partnerController.updateTakeRate(
          partner.props._id,
          {
            takeRate: newTakeRate,
          },
          {
            user: requestingPartnerAdmin,
          },
        );
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });
  });
});
