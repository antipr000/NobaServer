import { JwtModule } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../src/core/utils/WinstonModule";
import { AdminService } from "../../../../src/modules/admin/admin.service";
import { getMockAdminServiceWithDefaults } from "../../../../src/modules/admin/mocks/MockAdminService";
import { EmailService } from "../../../../src/modules/common/email.service";
import { getMockEmailServiceWithDefaults } from "../../../../src/modules/common/mocks/mock.email.service";
import { getMockSmsServiceWithDefaults } from "../../../../src/modules/common/mocks/mock.sms.service";
import { SMSService } from "../../../../src/modules/common/sms.service";
import { instance, when } from "ts-mockito";
import { AdminAuthService } from "../admin.auth.service";
import { getMockOtpRepoWithDefaults } from "../mocks/MockOtpRepo";
import { IOTPRepo } from "../repo/OTPRepo";
import { InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { nobaAdminIdentityIdentifier } from "../domain/IdentityType";
import { Otp } from "../domain/Otp";
import { Admin } from "../../../../src/modules/admin/domain/Admin";
import { NOBA_CONFIG_KEY, NOBA_PARTNER_ID } from "../../../config/ConfigurationUtils";

describe("AdminAuthService", () => {
  jest.setTimeout(5000);

  let mockAdminService: AdminService;
  let mockOtpRepo: IOTPRepo;
  let mockEmailService: EmailService;
  let mockSmsService: SMSService;

  let adminAuthService: AdminAuthService;

  const testJwtSecret = "TEST_SECRET";
  const identityType: string = nobaAdminIdentityIdentifier;
  const nobaPartnerID = "TEST_PARTNER_ID";

  // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
  /**
   *
   * This will be used to configure the testing module and will decouple
   * the testing module from the actual module.
   *
   * Never hard-code the environment variables "KEY_NAME" in the testing module.
   * All the keys used in 'appconfigs' are defined in
   * `config/ConfigurationUtils` and it should be used for all the testing modules.
   *
   **/
  const appConfigurations = {
    [NOBA_CONFIG_KEY]: {
      [NOBA_PARTNER_ID]: nobaPartnerID,
    },
  };
  // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

  beforeEach(async () => {
    mockAdminService = getMockAdminServiceWithDefaults();
    mockOtpRepo = getMockOtpRepoWithDefaults();
    mockEmailService = getMockEmailServiceWithDefaults();
    mockSmsService = getMockSmsServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync(appConfigurations),
        getTestWinstonModule(),
        JwtModule.register({
          secret: testJwtSecret,
          signOptions: { expiresIn: "604800s" } /* 1 week */,
        }),
      ],
      controllers: [],
      providers: [
        {
          provide: AdminService,
          useFactory: () => instance(mockAdminService),
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
        AdminAuthService,
      ],
    }).compile();

    adminAuthService = app.get<AdminAuthService>(AdminAuthService);
  });

  describe("validateAndGetUserId", () => {
    it("should throw 'NotFoundException' if user with given email doesn't exist", async () => {
      const NON_EXISTING_ADMIN_EMAIL = "abcd@noba.com";

      when(mockOtpRepo.getOTP(NON_EXISTING_ADMIN_EMAIL, identityType, nobaPartnerID)).thenReject(
        new NotFoundException(),
      );

      try {
        await adminAuthService.validateAndGetUserId(NON_EXISTING_ADMIN_EMAIL, 123456, nobaPartnerID);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it("should throw 'UnauthorizedException' if otp is incorrect", async () => {
      const EXISTING_ADMIN_EMAIL = "abcd@noba.com";
      const CORRECT_OTP = 123456;
      const TOMORROW_EXPIRY = new Date(new Date().getTime() + 3600 * 24 * 1000);

      const otpDomain: Otp = Otp.createOtp({
        _id: "1",
        emailOrPhone: EXISTING_ADMIN_EMAIL,
        otp: CORRECT_OTP,
        otpExpiryTime: TOMORROW_EXPIRY.getTime(),
        identityType: nobaAdminIdentityIdentifier,
      });
      when(mockOtpRepo.getOTP(EXISTING_ADMIN_EMAIL, identityType, nobaPartnerID)).thenResolve(otpDomain);

      try {
        await adminAuthService.validateAndGetUserId(EXISTING_ADMIN_EMAIL, 1234567, nobaPartnerID);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    });

    it("should throw 'UnauthorizedException' if otp is expired", async () => {
      const EXISTING_ADMIN_EMAIL = "abcd@noba.com";
      const CORRECT_OTP = 123456;
      const YESTERDAY_EXPIRY = new Date(new Date().getTime() - 3600 * 24 * 1000);

      const otpDomain: Otp = Otp.createOtp({
        _id: "1",
        emailOrPhone: EXISTING_ADMIN_EMAIL,
        otp: CORRECT_OTP,
        otpExpiryTime: YESTERDAY_EXPIRY.getTime(),
        identityType: nobaAdminIdentityIdentifier,
      });
      when(mockOtpRepo.getOTP(EXISTING_ADMIN_EMAIL, identityType, nobaPartnerID)).thenResolve(otpDomain);

      try {
        await adminAuthService.validateAndGetUserId(EXISTING_ADMIN_EMAIL, CORRECT_OTP, nobaPartnerID);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    });

    it("Should return Admin email address if OTP is correct and not expired", async () => {
      const EXISTING_ADMIN_EMAIL = "abcd@noba.com";
      const ADMIN_ID = "1111111111";
      const CORRECT_OTP = 123456;
      const TOMORROW_EXPIRY = new Date(new Date().getTime() + 3600 * 24 * 1000);

      const otpDomain: Otp = Otp.createOtp({
        _id: "1",
        emailOrPhone: EXISTING_ADMIN_EMAIL,
        otp: CORRECT_OTP,
        otpExpiryTime: TOMORROW_EXPIRY.getTime(),
        identityType: nobaAdminIdentityIdentifier,
      });
      when(mockOtpRepo.getOTP(EXISTING_ADMIN_EMAIL, identityType, nobaPartnerID)).thenResolve(otpDomain);
      when(mockOtpRepo.deleteOTP("1")).thenResolve();

      when(mockAdminService.getAdminByEmail(EXISTING_ADMIN_EMAIL)).thenResolve(
        Admin.createAdmin({
          _id: ADMIN_ID,
          email: EXISTING_ADMIN_EMAIL,
          name: "ADMIN",
          role: "BASIC",
        }),
      );

      const receivedAdminId = await adminAuthService.validateAndGetUserId(
        EXISTING_ADMIN_EMAIL,
        CORRECT_OTP,
        nobaPartnerID,
      );
      expect(receivedAdminId).toEqual(ADMIN_ID);
    });
  });

  describe("verifyUserExistence", () => {
    it("should return 'false' if service throws NotFoundException", async () => {
      const NON_EXISTING_ADMIN_EMAIL = "admin@noba.com";

      when(mockAdminService.getAdminByEmail(NON_EXISTING_ADMIN_EMAIL)).thenReject(new NotFoundException());

      const result = await adminAuthService.verifyUserExistence(NON_EXISTING_ADMIN_EMAIL);

      expect(result).toBe(false);
    });

    it("should return 'true' if service returns true", async () => {
      const EXISTING_ADMIN_EMAIL = "admin@noba.com";
      const admin: Admin = Admin.createAdmin({
        _id: "1111111111",
        email: EXISTING_ADMIN_EMAIL,
        role: "BASIC",
      });

      when(mockAdminService.getAdminByEmail(EXISTING_ADMIN_EMAIL)).thenResolve(admin);

      const result = await adminAuthService.verifyUserExistence(EXISTING_ADMIN_EMAIL);

      expect(result).toBe(true);
    });

    it("should rethrows 'InternalServerErrorException' if service throws it", async () => {
      const NON_EXISTING_ADMIN_EMAIL = "admin@noba.com";

      when(mockAdminService.getAdminByEmail(NON_EXISTING_ADMIN_EMAIL)).thenReject(new InternalServerErrorException());

      try {
        await adminAuthService.verifyUserExistence(NON_EXISTING_ADMIN_EMAIL);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(InternalServerErrorException);
      }
    });
  });
});
