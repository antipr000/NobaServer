import { TestingModule, Test } from "@nestjs/testing";
import { anything, deepEqual, instance, verify, when } from "ts-mockito";
import { getMockPartnerAdminRepoWithDefaults } from "../mocks/mock.partner.admin.repo";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { CommonModule } from "../../common/common.module";
import { PartnerAdminService } from "../partneradmin.service";
import { mockedUserService } from "../../../modules/user/mocks/userservicemock";
import { UserService } from "../../../modules/user/user.service";
import { NotFoundException } from "@nestjs/common";
import { PartnerAdmin } from "../domain/PartnerAdmin";
import { Result } from "../../../core/logic/Result";

describe("PartnerService", () => {
  let partnerAdminService: PartnerAdminService;
  const partnerAdminRepo = getMockPartnerAdminRepoWithDefaults();

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
      useFactory: () => instance(partnerAdminRepo),
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
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });

      when(partnerAdminRepo.addPartnerAdmin(anything())).thenResolve(partnerAdmin);

      const result = await partnerAdminService.addAdminForPartner(
        partnerAdmin.props._id,
        partnerAdmin.props.email,
        partnerAdmin.props.name,
        partnerAdmin.props.role,
      );
      expect(result).toStrictEqual(partnerAdmin);
    });

    it("should get a partner admin", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });

      when(partnerAdminRepo.getPartnerAdmin(partnerAdmin.props._id)).thenResolve(Result.ok(partnerAdmin));

      const result = await partnerAdminService.getPartnerAdmin(partnerAdmin.props._id);
      expect(result).toStrictEqual(partnerAdmin);
    });

    it("should get a partner admin given email", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });

      when(partnerAdminRepo.getPartnerAdminUsingEmail(partnerAdmin.props.email)).thenResolve(Result.ok(partnerAdmin));

      const result = await partnerAdminService.getPartnerAdminFromEmail(partnerAdmin.props.email);
      expect(result).toStrictEqual(partnerAdmin);
    });

    it("should throw error when email not found", async () => {
      const failureEmail = "notFound@noba.com";
      when(partnerAdminRepo.getPartnerAdminUsingEmail(failureEmail)).thenResolve(Result.fail("User not found"));
      try {
        await partnerAdminService.getPartnerAdminFromEmail(failureEmail);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });

    it("should get all partner details", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });

      const basicPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      when(partnerAdminRepo.getAllAdminsForPartner(partnerAdmin.props.partnerId)).thenResolve([
        partnerAdmin,
        basicPartnerAdmin,
      ]);

      const result = await partnerAdminService.getAllPartnerAdmins(partnerAdmin.props.partnerId);
      expect(result.length).toBe(2);
    });

    it("should update partner admin details", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });
      const updatedPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      when(partnerAdminRepo.updatePartnerAdmin(deepEqual(updatedPartnerAdmin))).thenResolve(updatedPartnerAdmin);

      const result = await partnerAdminService.updateAdminForPartner(
        partnerAdmin.props.partnerId,
        partnerAdmin.props._id,
        {
          role: updatedPartnerAdmin.props.role,
        },
      );
      expect(result).toStrictEqual(updatedPartnerAdmin);
    });

    it("should throw 'NotFoundException' when partner admin doesn't belong to partner", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });
      const updatedPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      when(partnerAdminRepo.updatePartnerAdmin(deepEqual(updatedPartnerAdmin))).thenResolve(updatedPartnerAdmin);

      try {
        await partnerAdminService.updateAdminForPartner("mock-partner-2", partnerAdmin.props._id, {
          role: updatedPartnerAdmin.props.role,
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });

    it("should delete a partner admin", async () => {
      const partnerAdminID = "mock-partner-admin-1";
      const partnerID = "mock-partner-1";
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminID,
        email: "mock@partner.com",
        partnerId: partnerID,
        role: "ALL",
      });

      when(partnerAdminRepo.removePartnerAdmin(partnerAdminID)).thenResolve();
      when(partnerAdminRepo.getPartnerAdmin(partnerAdminID)).thenResolve(Result.ok(partnerAdmin));

      const result = await partnerAdminService.deleteAdminForPartner(partnerID, partnerAdminID);

      verify(partnerAdminRepo.getPartnerAdmin(partnerAdminID)).called();
      verify(partnerAdminRepo.removePartnerAdmin(partnerAdminID)).called();
      expect(result).toStrictEqual(partnerAdmin);
    });

    it("should throw 'NotFoundException' if partner admin does not belong to partnerID", async () => {
      const partnerAdminID = "delete-admin-1";
      const partnerID = "mock-partner-1";
      const requestingAdminPartnerID = "mock-partner-2";
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminID,
        email: "mock@partner.com",
        partnerId: partnerID,
        role: "ALL",
      });

      when(partnerAdminRepo.removePartnerAdmin(partnerAdminID)).thenResolve();
      when(partnerAdminRepo.getPartnerAdmin(partnerAdminID)).thenResolve(Result.ok(partnerAdmin));

      try {
        await partnerAdminService.deleteAdminForPartner(requestingAdminPartnerID, partnerAdminID);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        verify(partnerAdminRepo.getPartnerAdmin(partnerAdminID)).called();
        verify(partnerAdminRepo.removePartnerAdmin(partnerAdminID)).never();
      }
    });
  });
});
