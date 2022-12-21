import { JwtModule } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../src/core/utils/WinstonModule";
import { AdminService } from "../../../../src/modules/admin/admin.service";
import { getMockAdminServiceWithDefaults } from "../../../../src/modules/admin/mocks/MockAdminService";
import { getMockSmsServiceWithDefaults } from "../../../../src/modules/common/mocks/mock.sms.service";
import { SMSService } from "../../../../src/modules/common/sms.service";
import { instance, when } from "ts-mockito";
import { AdminAuthService } from "../admin.auth.service";
import { InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { nobaAdminIdentityIdentifier } from "../domain/IdentityType";
import { Admin } from "../../../../src/modules/admin/domain/Admin";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { ITokenRepo } from "../repo/TokenRepo";
import { getMockTokenRepoWithDefaults } from "../mocks/MockTokenRepo";
import { OTPService } from "../../../modules/common/otp.service";
import { getMockOTPServiceWithDefaults } from "../../../modules/common/mocks/mock.otp.service.spec";

describe("AdminAuthService", () => {
  jest.setTimeout(5000);

  let mockAdminService: AdminService;
  let mockOTPService: OTPService;
  let mockSmsService: SMSService;
  let mockNotificationService: NotificationService;
  let mockTokenRepo: ITokenRepo;

  let adminAuthService: AdminAuthService;

  const testJwtSecret = "TEST_SECRET";
  const identityType = nobaAdminIdentityIdentifier;

  // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

  beforeEach(async () => {
    mockAdminService = getMockAdminServiceWithDefaults();
    mockOTPService = getMockOTPServiceWithDefaults();
    mockNotificationService = getMockNotificationServiceWithDefaults();
    mockSmsService = getMockSmsServiceWithDefaults();
    mockTokenRepo = getMockTokenRepoWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({}),
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
          provide: "TokenRepo",
          useFactory: () => instance(mockTokenRepo),
        },
        {
          provide: OTPService,
          useFactory: () => instance(mockOTPService),
        },
        {
          provide: NotificationService,
          useFactory: () => instance(mockNotificationService),
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
    it("should throw 'UnauthorizedException' if user with given email doesn't exist or otp is incorrect or expired", async () => {
      const NON_EXISTING_ADMIN_EMAIL = "abcd@noba.com";

      when(mockOTPService.checkIfOTPIsValidAndCleanup(NON_EXISTING_ADMIN_EMAIL, identityType, 123456)).thenResolve(
        false,
      );

      expect(async () => await adminAuthService.validateAndGetUserId(NON_EXISTING_ADMIN_EMAIL, 123456)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("Should return Admin email address if OTP is correct and not expired", async () => {
      const EXISTING_ADMIN_EMAIL = "abcd@noba.com";
      const ADMIN_ID = "1111111111";
      const CORRECT_OTP = 123456;

      when(mockOTPService.checkIfOTPIsValidAndCleanup(EXISTING_ADMIN_EMAIL, identityType, CORRECT_OTP)).thenResolve(
        true,
      );

      when(mockAdminService.getAdminByEmail(EXISTING_ADMIN_EMAIL)).thenResolve(
        Admin.createAdmin({
          _id: ADMIN_ID,
          email: EXISTING_ADMIN_EMAIL,
          name: "ADMIN",
          role: "BASIC",
        }),
      );

      const receivedAdminId = await adminAuthService.validateAndGetUserId(EXISTING_ADMIN_EMAIL, CORRECT_OTP);
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
