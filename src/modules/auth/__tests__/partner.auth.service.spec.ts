import { JwtModule } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { getWinstonModule } from "../../../../src/core/utils/WinstonModule";
import { PartnerAdminService } from "../../../modules/partner/partneradmin.service";
import { mockedPartnerAdminService } from "../../../modules/partner/mocks/partneradminservicemock";
import { EmailService } from "../../../../src/modules/common/email.service";
import { getMockEmailServiceWithDefaults } from "../../../../src/modules/common/mocks/mock.email.service";
import { getMockSmsServiceWithDefaults } from "../../../../src/modules/common/mocks/mock.sms.service";
import { SMSService } from "../../../../src/modules/common/sms.service";
import { instance, when } from "ts-mockito";
import { getMockOtpRepoWithDefaults } from "../mocks/MockOtpRepo";
import { IOTPRepo } from "../repo/OTPRepo";
import { InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { partnerAdminIdentityIdenitfier } from "../domain/IdentityType";
import { Otp } from "../domain/Otp";
import { PartnerAuthService } from "../partner.auth.service";
import { mockPartnerAdminWithAllAccess } from "../../../core/tests/constants";
import { PartnerAdmin } from "../../../../src/modules/partner/domain/PartnerAdmin";

describe("AdminService", () => {
  jest.setTimeout(5000);

  let mockPartnerAdminService: PartnerAdminService;
  let mockOtpRepo: IOTPRepo;
  let mockEmailService: EmailService;
  let mockSmsService: SMSService;

  let partnerAuthService: PartnerAuthService;

  const testJwtSecret = "TEST_SECRET";
  const identityType: string = partnerAdminIdentityIdenitfier;

  beforeEach(async () => {
    mockPartnerAdminService = mockedPartnerAdminService;
    mockOtpRepo = getMockOtpRepoWithDefaults();
    mockEmailService = getMockEmailServiceWithDefaults();
    mockSmsService = getMockSmsServiceWithDefaults();

    process.env = {
      ...process.env,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        getWinstonModule(),
        getAppConfigModule(),
        JwtModule.register({
          secret: testJwtSecret,
          signOptions: { expiresIn: "86400s" } /* 1 day */,
        }),
      ],
      controllers: [],
      providers: [
        {
          provide: PartnerAdminService,
          useFactory: () => instance(mockPartnerAdminService),
        },
        {
          provide: "OTPRepo",
          useFactory: () => instance(mockOtpRepo),
        },
        {
          provide: EmailService,
          useFactory: () => instance(mockEmailService),
        },
        {
          provide: SMSService,
          useFactory: () => instance(mockSmsService),
        },
        PartnerAuthService,
      ],
    }).compile();

    partnerAuthService = app.get<PartnerAuthService>(PartnerAuthService);
  });

  describe("validateAndGetUserId", () => {
    it("should throw NotFoundException if user with given email doesn't exist", async () => {
      const NON_EXISTING_PARTNER_ADMIN_EMAIL = "abcd@noba.com";

      when(mockOtpRepo.getOTP(NON_EXISTING_PARTNER_ADMIN_EMAIL, identityType)).thenReject(new NotFoundException());

      try {
        await partnerAuthService.validateAndGetUserId(NON_EXISTING_PARTNER_ADMIN_EMAIL, 123456);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it("should throw UnauthorizedException if otp is incorrect", async () => {
      const EXISTING_PARTNER_ADMIN_EMAIL = "abcd@noba.com";
      const CORRECT_OTP = 123456;
      const TOMORROW_EXPIRY = new Date(new Date().getTime() + 3600 * 24 * 1000);

      const otpDomain: Otp = Otp.createOtp({
        _id: EXISTING_PARTNER_ADMIN_EMAIL,
        otp: CORRECT_OTP,
        otpExpiryTime: TOMORROW_EXPIRY.getTime(),
        identityType: partnerAdminIdentityIdenitfier,
      });
      when(mockOtpRepo.getOTP(EXISTING_PARTNER_ADMIN_EMAIL, identityType)).thenResolve(otpDomain);

      try {
        await partnerAuthService.validateAndGetUserId(EXISTING_PARTNER_ADMIN_EMAIL, 1234567);
      } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    });

    it("should throw UnauthorizedException if otp is expired", async () => {
      const EXISTING_PARTNER_ADMIN_EMAIL = "abcd@noba.com";
      const CORRECT_OTP = 123456;
      const YESTERDAY_EXPIRY = new Date(new Date().getTime() - 3600 * 24 * 1000);

      const otpDomain: Otp = Otp.createOtp({
        _id: EXISTING_PARTNER_ADMIN_EMAIL,
        otp: CORRECT_OTP,
        otpExpiryTime: YESTERDAY_EXPIRY.getTime(),
        identityType: partnerAdminIdentityIdenitfier,
      });
      when(mockOtpRepo.getOTP(EXISTING_PARTNER_ADMIN_EMAIL, identityType)).thenResolve(otpDomain);

      try {
        await partnerAuthService.validateAndGetUserId(EXISTING_PARTNER_ADMIN_EMAIL, CORRECT_OTP);
      } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    });

    it("should return PartnerAdmin._id for correct PartnerAdmin", async () => {
      const EXISTING_PARTNER_ADMIN_EMAIL = mockPartnerAdminWithAllAccess.email;
      const CORRECT_OTP = 123456;
      const TOMORROW_EXPIRY = new Date(new Date().getTime() + 3600 * 24 * 1000);

      const otpDomain: Otp = Otp.createOtp({
        _id: EXISTING_PARTNER_ADMIN_EMAIL,
        otp: CORRECT_OTP,
        otpExpiryTime: TOMORROW_EXPIRY.getTime(),
        identityType: partnerAdminIdentityIdenitfier,
      });
      when(mockOtpRepo.getOTP(EXISTING_PARTNER_ADMIN_EMAIL, identityType)).thenResolve(otpDomain);

      const receivedAdminId = await partnerAuthService.validateAndGetUserId(EXISTING_PARTNER_ADMIN_EMAIL, CORRECT_OTP);
      expect(receivedAdminId).toEqual(mockPartnerAdminWithAllAccess._id);
    });
  });

  describe("verifyUserExistence", () => {
    it("should return 'false' if service throws NotFoundException", async () => {
      const NON_EXISTING_PARTNER_ADMIN_EMAIL = "partner.admin@noba.com";

      when(mockPartnerAdminService.getPartnerAdminFromEmail(NON_EXISTING_PARTNER_ADMIN_EMAIL))
        .thenReject(new NotFoundException());

      const result = await partnerAuthService.verifyUserExistence(NON_EXISTING_PARTNER_ADMIN_EMAIL);

      expect(result).toBe(false);
    });

    it("should return 'true' if service returns true", async () => {
      const EXISTING_PARTNER_ADMIN_EMAIL = "partner.admin@noba.com";
      const partnerAdmin: PartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "1111111111",
        email: EXISTING_PARTNER_ADMIN_EMAIL,
        role: "BASIC",
        partnerId: "PPPPPPPPPPP"
      });

      when(mockPartnerAdminService.getPartnerAdminFromEmail(EXISTING_PARTNER_ADMIN_EMAIL))
        .thenResolve(partnerAdmin);

      const result = await partnerAuthService.verifyUserExistence(EXISTING_PARTNER_ADMIN_EMAIL);

      expect(result).toBe(true);
    });

    it("should rethrows 'InternalServerErrorException' if service throws it", async () => {
      const NON_EXISTING_PARTNER_ADMIN_EMAIL = "partner.admin@noba.com";

      when(mockPartnerAdminService.getPartnerAdminFromEmail(NON_EXISTING_PARTNER_ADMIN_EMAIL))
        .thenReject(new InternalServerErrorException());

      try {
        await partnerAuthService.verifyUserExistence(NON_EXISTING_PARTNER_ADMIN_EMAIL);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });
});