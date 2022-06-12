import { TestingModule, Test } from "@nestjs/testing";
import { instance } from "ts-mockito";
import { mockedPartnerAdminRepo } from "../mocks/partneradminrepomock";
import { mockPartnerAdminWithAllAccess, mockFailureEmailAddress } from "../../../core/tests/constants";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { CommonModule } from "../../common/common.module";
import { PartnerAdminService } from "../partneradmin.service";
import { mockedUserService } from "../../../modules/user/mocks/userservicemock";
import { UserService } from "../../../modules/user/user.service";
import { NotFoundException } from "@nestjs/common";

describe("PartnerService", () => {
  let partnerAdminService: PartnerAdminService;

  jest.setTimeout(20000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };
    const PartnerAdminRepoProvider = {
      provide: "PartnerAdminRepo",
      useFactory: () => instance(mockedPartnerAdminRepo),
    };
    const UserServiceMockProvider = {
      provide: UserService,
      useFactory: () => instance(mockedUserService),
    };
    const app: TestingModule = await Test.createTestingModule({
      imports: [getWinstonModule(), getAppConfigModule(), CommonModule],
      controllers: [],
      providers: [PartnerAdminRepoProvider, PartnerAdminService, UserServiceMockProvider],
    }).compile();

    partnerAdminService = app.get<PartnerAdminService>(PartnerAdminService);
  });

  describe("partner admin service tests", () => {
    it("should add a new partner admin", async () => {
      const result = await partnerAdminService.addPartnerAdmin(
        mockPartnerAdminWithAllAccess.partnerId,
        mockPartnerAdminWithAllAccess.email,
      );
      expect(result.props).toStrictEqual(mockPartnerAdminWithAllAccess);
    });

    it("should get a partner admin", async () => {
      const result = await partnerAdminService.getPartnerAdmin(mockPartnerAdminWithAllAccess._id);
      expect(result.props).toStrictEqual(mockPartnerAdminWithAllAccess);
    });

    it("should get a partner admin given email", async () => {
      const result = await partnerAdminService.getPartnerAdminFromEmail(mockPartnerAdminWithAllAccess.email);
      expect(result.props).toStrictEqual(mockPartnerAdminWithAllAccess);
    });

    it("should throw error when email not found", async () => {
      try {
        await partnerAdminService.getPartnerAdminFromEmail(mockFailureEmailAddress);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });

    it("should get all partner details", async () => {
      const result = await partnerAdminService.getAllPartnerAdmins(mockPartnerAdminWithAllAccess.partnerId);
      expect(result.length).toBe(3);
    });
  });
});
