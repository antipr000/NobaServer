import { TestingModule, Test } from "@nestjs/testing";
import { instance } from "ts-mockito";
import { PartnerService } from "../partner.service";
import { mockedPartnerAdminService } from "../mocks/partneradminservicemock";
import { mockedPartnerService } from "../mocks/partnerservicemock";
import {
  mockPartner,
  mockPartnerAdminWithAllAccess,
  mockPartnerAdminWithBasicAccess,
  mockPartnerAdminWithIntermediateAccess,
  updateTakeRate,
} from "../../../core/tests/constants";
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

    const PartnerServiceProvider = {
      provide: PartnerService,
      useFactory: () => instance(mockedPartnerService),
    };

    const PartnerAdminServiceProvider = {
      provide: PartnerAdminService,
      useFactory: () => instance(mockedPartnerAdminService),
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
      const partnerAdminToAdd = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);
      const mockRequest = {
        user: requestingPartnerAdmin,
      };

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
      const partnerAdminToAdd = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess);
      const mockRequest = {
        user: requestingPartnerAdmin,
      };

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
      const partnerAdminToAdd = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithIntermediateAccess);
      const mockRequest = {
        user: requestingPartnerAdmin,
      };

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
      const partnerId = mockPartnerAdminWithAllAccess.partnerId;
      const partnerAdminAllAccessId = mockPartnerAdminWithAllAccess._id;
      const partnerAdminBasicAccessId = mockPartnerAdminWithBasicAccess._id;
      const partnerAdminIntermediateAccessId = mockPartnerAdminWithIntermediateAccess._id;

      const allAccessAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);
      const basicAccessAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess);
      const intermediateAccessAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithIntermediateAccess);

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
      const partnerId = mockPartnerAdminWithAllAccess.partnerId;
      const partnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess);
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);

      const result = await partnerController.getPartnerAdmin(partnerId, partnerAdmin.props._id, {
        user: requestingPartnerAdmin,
      });

      expect(result).toStrictEqual(partnerAdminMapper.toDTO(partnerAdmin));
    });

    it("should throw error when getting data of a different admin with basic access", async () => {
      const partnerId = mockPartnerAdminWithAllAccess.partnerId;
      const partnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess);

      try {
        await partnerController.getPartnerAdmin(partnerId, partnerAdmin.props._id, {
          user: requestingPartnerAdmin,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw error when getting data of a different admin with intermediate access", async () => {
      const partnerId = mockPartnerAdminWithAllAccess.partnerId;
      const partnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithIntermediateAccess);

      try {
        await partnerController.getPartnerAdmin(partnerId, partnerAdmin.props._id, {
          user: requestingPartnerAdmin,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should get all admins when requesting user has all access", async () => {
      const partnerId = mockPartnerAdminWithAllAccess.partnerId;
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);
      const result = await partnerController.getAllPartnerAdmins(partnerId, {
        user: requestingPartnerAdmin,
      });

      expect(result.length).toBe(3);
    });

    it("should throw error when admin with basic access tries getting all admins", async () => {
      const partnerId = mockPartnerAdminWithAllAccess.partnerId;
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess);
      try {
        partnerController.getAllPartnerAdmins(partnerId, {
          user: requestingPartnerAdmin,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw error when admin with intermediate access tries getting all admins", async () => {
      const partnerId = mockPartnerAdminWithAllAccess.partnerId;
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithIntermediateAccess);
      try {
        partnerController.getAllPartnerAdmins(partnerId, {
          user: requestingPartnerAdmin,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should get partner details", async () => {
      const partner = Partner.createPartner(mockPartner);
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess);

      const result = await partnerController.getPartner(partner.props._id, {
        user: requestingPartnerAdmin,
      });

      expect(result).toStrictEqual(partnerMapper.toDTO(partner));
    });

    it("should update partner details when requesting admin has all access", async () => {
      const partner = Partner.createPartner(mockPartner);
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);

      const result = await partnerController.updateTakeRate(
        partner.props._id,
        {
          takeRate: updateTakeRate,
        },
        {
          user: requestingPartnerAdmin,
        },
      );

      expect(result).toStrictEqual(
        partnerMapper.toDTO(
          Partner.createPartner({
            ...mockPartner,
            takeRate: updateTakeRate,
          }),
        ),
      );
    });

    it("throw error on update partner details when requesting admin has basic access", async () => {
      const partner = Partner.createPartner(mockPartner);
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess);

      try {
        await partnerController.updateTakeRate(
          partner.props._id,
          {
            takeRate: updateTakeRate,
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
      const partner = Partner.createPartner(mockPartner);
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithIntermediateAccess);
      try {
        await partnerController.updateTakeRate(
          partner.props._id,
          {
            takeRate: updateTakeRate,
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
