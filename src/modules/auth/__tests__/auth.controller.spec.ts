import { Test, TestingModule } from "@nestjs/testing";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { anyString, instance, when } from "ts-mockito";
import { AdminAuthService } from "../admin.auth.service";
import { UserAuthService } from "../user.auth.service";
import { getMockAdminAuthServiceWithDefaults } from "../mocks/mock.admin.auth.service";
import { getMockUserAuthServiceWithDefaults } from "../mocks/mock.user.auth.service";
import { getMockPartnerAuthServiceWithDefaults } from "../mocks/mock.partner.auth.service";
import { AuthController } from "../auth.controller";
import { consumerIdentityIdentifier, nobaAdminIdentityIdentifier, partnerAdminIdentityIdenitfier } from "../domain/IdentityType";
import { VerifyOtpResponseDTO } from "../dto/VerifyOtpReponse";
import { PartnerAuthService } from "../partner.auth.service";
import { ForbiddenException } from "@nestjs/common";

describe("AdminService", () => {
  jest.setTimeout(5000);

  let mockAdminAuthService: AdminAuthService;
  let mockConsumerAuthService: UserAuthService;
  let mockPartnerAuthService: PartnerAuthService;

  let authController: AuthController;

  beforeEach(async () => {
    mockAdminAuthService = getMockAdminAuthServiceWithDefaults();
    mockConsumerAuthService = getMockUserAuthServiceWithDefaults();
    mockPartnerAuthService = getMockPartnerAuthServiceWithDefaults();

    process.env = {
      ...process.env,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [getWinstonModule(), getAppConfigModule()],
      controllers: [AuthController],
      providers: [
        {
          provide: UserAuthService,
          useFactory: () => instance(mockConsumerAuthService),
        },
        {
          provide: AdminAuthService,
          useFactory: () => instance(mockAdminAuthService),
        },
        {
          provide: PartnerAuthService,
          useFactory: () => instance(mockPartnerAuthService),
        },
      ],
    }).compile();

    authController = app.get<AuthController>(AuthController);
  });

  describe("verifyOtp", () => {
    it("should use 'AdminAuthService' if 'identityType' is 'NOBA_ADMIN'", async () => {
      const adminId = "1111111111";
      const adminEmail = "admin@noba.com";
      const identityType: string = nobaAdminIdentityIdentifier;
      const otp = 123456;
      const generateAccessTokenResponse: VerifyOtpResponseDTO = {
        user_id: adminId,
        access_token: "xxxxxx-yyyyyy-zzzzzz",
      };

      when(mockAdminAuthService.validateAndGetUserId(adminEmail, otp)).thenResolve(adminId);
      when(mockAdminAuthService.generateAccessToken(adminId)).thenResolve(generateAccessTokenResponse);

      const result: VerifyOtpResponseDTO = await authController.verifyOtp({
        emailOrPhone: adminEmail,
        identityType: identityType,
        otp: otp,
      });

      expect(result).toEqual(generateAccessTokenResponse);
    });

    it("should use 'UserAuthService' if 'identityType' is 'CONSUMER'", async () => {
      const consumerId = "1111111111";
      const consumerEmail = "consumer@noba.com";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;
      const generateAccessTokenResponse: VerifyOtpResponseDTO = {
        user_id: consumerId,
        access_token: "xxxxxx-yyyyyy-zzzzzz",
      };

      when(mockConsumerAuthService.validateAndGetUserId(consumerEmail, otp)).thenResolve(consumerId);
      when(mockConsumerAuthService.generateAccessToken(consumerId)).thenResolve(generateAccessTokenResponse);

      const result: VerifyOtpResponseDTO = await authController.verifyOtp({
        emailOrPhone: consumerEmail,
        identityType: identityType,
        otp: otp,
      });

      expect(result).toEqual(generateAccessTokenResponse);
    });
  });

  describe("login", () => {
    it("should use 'AdminAuthService' if 'identityType' is 'NOBA_ADMIN'", async () => {
      const adminEmail = "admin@noba.com";
      const identityType: string = nobaAdminIdentityIdentifier;
      const otp = 123456;

      when(mockAdminAuthService.createOtp()).thenReturn(otp);
      when(mockAdminAuthService.saveOtp(adminEmail, otp)).thenResolve();
      when(mockAdminAuthService.sendOtp(adminEmail, otp.toString())).thenResolve();
      when(mockAdminAuthService.verifyUserExistence(adminEmail))
        .thenResolve(true);

      await authController.loginUser({
        email: adminEmail,
        identityType: identityType,
      });
    });

    it("should use 'UserAuthService' if 'identityType' is 'CONSUMER'", async () => {
      const consumerEmail = "consumer@noba.com";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.createOtp()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString()))
        .thenResolve(true);

      await authController.loginUser({
        email: consumerEmail,
        identityType: identityType,
      });
    });

    it("should use 'PartnerAuthService' if 'identityType' is 'PARTNER_ADMIN'", async () => {
      const partnerAdminEmail = "partner.admin@noba.com";
      const identityType: string = partnerAdminIdentityIdenitfier;
      const otp = 123456;

      when(mockPartnerAuthService.createOtp()).thenReturn(otp);
      when(mockPartnerAuthService.saveOtp(partnerAdminEmail, otp)).thenResolve();
      when(mockPartnerAuthService.sendOtp(partnerAdminEmail, otp.toString())).thenResolve();
      when(mockPartnerAuthService.verifyUserExistence(anyString()))
        .thenResolve(true);

      await authController.loginUser({
        email: partnerAdminEmail,
        identityType: identityType,
      });
    });

    it("should throw 'ForbiddenException' if unregistered Admin tries to login as 'NOBA_ADMIN'", async () => {
      const unregisteredAdminEmail = "admin@noba.com";
      const identityType: string = nobaAdminIdentityIdentifier;

      when(mockAdminAuthService.verifyUserExistence(unregisteredAdminEmail))
        .thenResolve(false);

      try {
        await authController.loginUser({
          email: unregisteredAdminEmail,
          identityType: identityType,
        });
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw 'ForbiddenException' if unregistered PartnerAdmin tries to login as 'PARTNER_ADMIN'", async () => {
      const unregisteredPartnerAdminEmail = "partner-admin@noba.com";
      const identityType: string = partnerAdminIdentityIdenitfier;

      when(mockPartnerAuthService.verifyUserExistence(unregisteredPartnerAdminEmail))
        .thenResolve(false);

      try {
        await authController.loginUser({
          email: unregisteredPartnerAdminEmail,
          identityType: identityType,
        });
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });
  });
});
