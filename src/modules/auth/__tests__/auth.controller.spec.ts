import { Test, TestingModule } from "@nestjs/testing";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { AdminAuthService } from "../admin.auth.service";
import { UserAuthService } from "../user.auth.service";
import { getMockAdminAuthServiceWithDefaults } from "../mocks/mock.admin.auth.service";
import { getMockUserAuthServiceWithDefaults } from "../mocks/mock.user.auth.service";
import { getMockPartnerAuthServiceWithDefaults } from "../mocks/mock.partner.auth.service";
import { AuthController } from "../auth.controller";
import { consumerIdentityIdentifier, nobaAdminIdentityIdentifier } from "../domain/IdentityType";
import { VerifyOtpResponseDTO } from "../dto/VerifyOtpReponse";
import { PartnerAuthService } from "../partner.auth.service";

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
    it("should use \"AdminAuthService\" if \"identityType\" is \"NOBA_ADMIN\"", async () => {
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

    it("should use \"UserAuthService\" if \"identityType\" is \"CONSUMER\"", async () => {
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
    it("should use \"AdminAuthService\" if \"identityType\" is \"NOBA_ADMIN\"", async () => {
      const adminEmail = "admin@noba.com";
      const identityType: string = nobaAdminIdentityIdentifier;
      const otp = 123456;

      when(mockAdminAuthService.createOtp()).thenReturn(otp);
      when(mockAdminAuthService.saveOtp(adminEmail, otp)).thenResolve();
      when(mockAdminAuthService.sendOtp(adminEmail, otp.toString())).thenResolve();

      await authController.loginUser({
        email: adminEmail,
        identityType: identityType,
      });
    });

    it("should use \"UserAuthService\" if \"identityType\" is \"CONSUMER\"", async () => {
      const consumerEmail = "consumer@noba.com";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.createOtp()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();

      await authController.loginUser({
        email: consumerEmail,
        identityType: identityType,
      });
    });
  });
});
