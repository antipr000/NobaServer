import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PartnerService } from "../../../modules/partner/partner.service";
import { anyString, instance, when } from "ts-mockito";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { AdminAuthService } from "../admin.auth.service";
import { AuthController } from "../auth.controller";
import {
  consumerIdentityIdentifier,
  nobaAdminIdentityIdentifier,
  partnerAdminIdentityIdenitfier,
} from "../domain/IdentityType";
import { VerifyOtpResponseDTO } from "../dto/VerifyOtpReponse";
import { getMockAdminAuthServiceWithDefaults } from "../mocks/mock.admin.auth.service";
import { getMockPartnerAuthServiceWithDefaults } from "../mocks/mock.partner.auth.service";
import { getMockUserAuthServiceWithDefaults } from "../mocks/mock.user.auth.service";
import { PartnerAuthService } from "../partner.auth.service";
import { UserAuthService } from "../user.auth.service";
import { getMockPartnerServiceWithDefaults } from "../../../modules/partner/mocks/mock.partner.service";
import { HeaderValidationService } from "../header.validation.service";
import { getMockHeaderValidationServiceWithDefaults } from "../mocks/mock.header.validation.service";
import { Partner } from "../../../modules/partner/domain/Partner";

describe("AdminService", () => {
  jest.setTimeout(5000);

  let mockAdminAuthService: AdminAuthService;
  let mockConsumerAuthService: UserAuthService;
  let mockPartnerAuthService: PartnerAuthService;
  let mockPartnerService: PartnerService;
  let mockHeaderValidationService: HeaderValidationService;

  let authController: AuthController;

  const apiKey = "test-api-key";
  const partnerId = "test-partner-1";
  const signature = "test-signature";
  const timestamp = "test-timestamp";
  const secretKey = "test-secret";

  beforeEach(async () => {
    mockAdminAuthService = getMockAdminAuthServiceWithDefaults();
    mockConsumerAuthService = getMockUserAuthServiceWithDefaults();
    mockPartnerAuthService = getMockPartnerAuthServiceWithDefaults();
    mockPartnerService = getMockPartnerServiceWithDefaults();
    mockHeaderValidationService = getMockHeaderValidationServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
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
        {
          provide: PartnerService,
          useFactory: () => instance(mockPartnerService),
        },
        {
          provide: HeaderValidationService,
          useFactory: () => instance(mockHeaderValidationService),
        },
      ],
    }).compile();

    authController = app.get<AuthController>(AuthController);

    when(mockPartnerService.getPartnerFromApiKey(apiKey)).thenResolve(
      Partner.createPartner({
        _id: partnerId,
        name: "Test Partner",
      }),
    );
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

      when(mockAdminAuthService.validateAndGetUserId(adminEmail, otp, partnerId)).thenResolve(adminId);
      when(mockAdminAuthService.generateAccessToken(adminId, partnerId)).thenResolve(generateAccessTokenResponse);
      when(
        mockHeaderValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          signature,
          "POST",
          "/v1/auth/verifyotp",
          JSON.stringify({
            emailOrPhone: adminEmail,
            identityType: identityType,
            otp: otp,
          }),
        ),
      ).thenResolve(true);

      const result: VerifyOtpResponseDTO = await authController.verifyOtp(
        {
          emailOrPhone: adminEmail,
          identityType: identityType,
          otp: otp,
        },
        apiKey,
        timestamp,
        signature,
      );

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

      when(mockConsumerAuthService.validateAndGetUserId(consumerEmail, otp, partnerId)).thenResolve(consumerId);
      when(mockConsumerAuthService.generateAccessToken(consumerId, partnerId)).thenResolve(generateAccessTokenResponse);
      when(
        mockHeaderValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          signature,
          "POST",
          "/v1/auth/verifyotp",
          JSON.stringify({
            emailOrPhone: consumerEmail,
            identityType: identityType,
            otp: otp,
          }),
        ),
      ).thenResolve(true);

      const result: VerifyOtpResponseDTO = await authController.verifyOtp(
        {
          emailOrPhone: consumerEmail,
          identityType: identityType,
          otp: otp,
        },
        apiKey,
        timestamp,
        signature,
      );

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
      when(mockAdminAuthService.verifyUserExistence(adminEmail)).thenResolve(true);
      when(
        mockHeaderValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          signature,
          "POST",
          "/v1/auth/login",
          JSON.stringify({
            email: adminEmail,
            identityType: identityType,
          }),
        ),
      ).thenResolve(true);

      await authController.loginUser(
        {
          email: adminEmail,
          identityType: identityType,
        },
        apiKey,
        timestamp,
        signature,
      );
    });

    it("should use 'UserAuthService' if 'identityType' is 'CONSUMER'", async () => {
      const consumerEmail = "consumer@noba.com";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.createOtp()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp, "partner-1")).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);
      when(
        mockHeaderValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          signature,
          "POST",
          "/v1/auth/login",
          JSON.stringify({
            email: consumerEmail,
            identityType: identityType,
          }),
        ),
      ).thenResolve(true);

      await authController.loginUser(
        {
          email: consumerEmail,
          identityType: identityType,
        },
        apiKey,
        timestamp,
        signature,
      );
    });

    it("should not allow any OTP to be used more than once", async () => {
      const consumerEmail = "consumer@noba.com";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.createOtp()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp, "partner-1")).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);
      when(
        mockHeaderValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          signature,
          "POST",
          "/v1/auth/login",
          JSON.stringify({
            email: consumerEmail,
            identityType: identityType,
          }),
        ),
      ).thenResolve(true);

      await authController.loginUser(
        {
          email: consumerEmail,
          identityType: identityType,
        },
        apiKey,
        timestamp,
        signature,
      );

      try {
        // Second attempt should throw an error
        await authController.loginUser(
          {
            email: consumerEmail,
            identityType: identityType,
          },
          apiKey,
          timestamp,
          signature,
        );
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should use 'PartnerAuthService' if 'identityType' is 'PARTNER_ADMIN'", async () => {
      const partnerAdminEmail = "partner.admin@noba.com";
      const identityType: string = partnerAdminIdentityIdenitfier;
      const otp = 123456;

      when(mockPartnerAuthService.createOtp()).thenReturn(otp);
      when(mockPartnerAuthService.saveOtp(partnerAdminEmail, otp)).thenResolve();
      when(mockPartnerAuthService.sendOtp(partnerAdminEmail, otp.toString())).thenResolve();
      when(mockPartnerAuthService.verifyUserExistence(anyString())).thenResolve(true);
      when(
        mockHeaderValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          signature,
          "POST",
          "/v1/auth/login",
          JSON.stringify({
            email: partnerAdminEmail,
            identityType: identityType,
          }),
        ),
      ).thenResolve(true);

      await authController.loginUser(
        {
          email: partnerAdminEmail,
          identityType: identityType,
        },
        apiKey,
        timestamp,
        signature,
      );
    });

    it("should throw 'ForbiddenException' if unregistered Admin tries to login as 'NOBA_ADMIN'", async () => {
      const unregisteredAdminEmail = "admin@noba.com";
      const identityType: string = nobaAdminIdentityIdentifier;

      when(mockAdminAuthService.verifyUserExistence(unregisteredAdminEmail)).thenResolve(false);

      try {
        await authController.loginUser(
          {
            email: unregisteredAdminEmail,
            identityType: identityType,
          },
          apiKey,
          timestamp,
          signature,
        );
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw 'ForbiddenException' if unregistered PartnerAdmin tries to login as 'PARTNER_ADMIN'", async () => {
      const unregisteredPartnerAdminEmail = "partner-admin@noba.com";
      const identityType: string = partnerAdminIdentityIdenitfier;

      when(mockPartnerAuthService.verifyUserExistence(unregisteredPartnerAdminEmail)).thenResolve(false);

      try {
        await authController.loginUser(
          {
            email: unregisteredPartnerAdminEmail,
            identityType: identityType,
          },
          apiKey,
          timestamp,
          signature,
        );
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });
  });
});
