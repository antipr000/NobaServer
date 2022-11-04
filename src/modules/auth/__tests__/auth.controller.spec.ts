import { BadRequestException, ForbiddenException } from "@nestjs/common";
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

describe("AuthController", () => {
  jest.setTimeout(5000);

  let mockAdminAuthService: AdminAuthService;
  let mockConsumerAuthService: UserAuthService;
  let mockPartnerAuthService: PartnerAuthService;
  let mockPartnerService: PartnerService;
  let mockHeaderValidationService: HeaderValidationService;

  let authController: AuthController;

  const apiKey = "test-api-key";
  const partnerId = "test-partner-1";

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

      when(mockAdminAuthService.validateAndGetUserId(adminEmail, otp, partnerId, true)).thenResolve(adminId);
      when(mockAdminAuthService.generateAccessToken(adminId, partnerId)).thenResolve(generateAccessTokenResponse);

      const result: VerifyOtpResponseDTO = await authController.verifyOtp(
        {
          emailOrPhone: adminEmail,
          identityType: identityType,
          otp: otp,
        },
        {
          "x-noba-api-key": apiKey,
        },
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

      when(mockConsumerAuthService.validateAndGetUserId(consumerEmail, otp, partnerId, true)).thenResolve(consumerId);
      when(mockConsumerAuthService.generateAccessToken(consumerId, partnerId)).thenResolve(generateAccessTokenResponse);

      const result: VerifyOtpResponseDTO = await authController.verifyOtp(
        {
          emailOrPhone: consumerEmail,
          identityType: identityType,
          otp: otp,
        },
        {
          "x-noba-api-key": apiKey,
        },
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
      when(mockAdminAuthService.sendOtp(adminEmail, otp.toString(), partnerId)).thenResolve();
      when(mockAdminAuthService.verifyUserExistence(adminEmail)).thenResolve(true);

      await authController.loginUser(
        {
          email: adminEmail,
          identityType: identityType,
        },
        {
          "x-noba-api-key": apiKey,
        },
      );
    });

    it("should use 'UserAuthService' if 'identityType' is 'CONSUMER'", async () => {
      const consumerEmail = "consumer@noba.com";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.createOtp()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp, "partner-1")).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString(), partnerId)).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);

      await authController.loginUser(
        {
          email: consumerEmail,
          identityType: identityType,
        },
        {
          "x-noba-api-key": apiKey,
        },
      );
    });

    it("should work with emailOrPhoneAttribute too, with email as input", async () => {
      const consumerEmail = "consumer@noba.com";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.createOtp()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp, "partner-1")).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString(), partnerId)).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);

      await authController.loginUser(
        {
          emailOrPhone: consumerEmail,
          identityType: identityType,
        },
        {
          "x-noba-api-key": apiKey,
        },
      );
    });

    it("should work with emailOrPhoneAttribute too, with phone as input", async () => {
      const consumerPhone = "+1242425252";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.createOtp()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerPhone, otp, "partner-1")).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerPhone, otp.toString(), partnerId)).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);

      await authController.loginUser(
        {
          emailOrPhone: consumerPhone,
          identityType: identityType,
        },
        {
          "x-noba-api-key": apiKey,
        },
      );
    });

    it("should throw if phone used for partner admin or noba admin for login", async () => {
      const phone = "+123424242";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.createOtp()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(phone, otp, "partner-1")).thenResolve();
      when(mockConsumerAuthService.sendOtp(phone, otp.toString(), partnerId)).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);
      try {
        await authController.loginUser(
          {
            email: phone,
            identityType: identityType,
          },
          {
            "x-noba-api-key": apiKey,
          },
        );
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it("should not allow any OTP to be used more than once", async () => {
      const consumerEmail = "consumer@noba.com";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.createOtp()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp, "partner-1")).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString(), partnerId)).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);

      await authController.loginUser(
        {
          email: consumerEmail,
          identityType: identityType,
        },
        {
          "x-noba-api-key": apiKey,
        },
      );

      try {
        // Second attempt should throw an error
        await authController.loginUser(
          {
            email: consumerEmail,
            identityType: identityType,
          },
          {
            "x-noba-api-key": apiKey,
          },
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
      when(mockPartnerAuthService.sendOtp(partnerAdminEmail, otp.toString(), partnerId)).thenResolve();
      when(mockPartnerAuthService.verifyUserExistence(anyString())).thenResolve(true);

      await authController.loginUser(
        {
          email: partnerAdminEmail,
          identityType: identityType,
        },
        {
          "x-noba-api-key": apiKey,
        },
      );
    });

    it("should throw if phone number is used for partner admin or noba admin'", async () => {
      const partnerAdminPhone = "+1424242424"; // using phone for partner loging
      const identityType: string = partnerAdminIdentityIdenitfier;
      const otp = 123456;

      when(mockPartnerAuthService.createOtp()).thenReturn(otp);
      when(mockPartnerAuthService.saveOtp(partnerAdminPhone, otp)).thenResolve();
      when(mockPartnerAuthService.sendOtp(partnerAdminPhone, otp.toString(), partnerId)).thenResolve();
      when(mockPartnerAuthService.verifyUserExistence(anyString())).thenResolve(true);

      try {
        await authController.loginUser(
          {
            email: partnerAdminPhone,
            identityType: identityType,
          },
          {
            "x-noba-api-key": apiKey,
          },
        );
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
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
          {
            "x-noba-api-key": apiKey,
          },
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
          {
            "x-noba-api-key": apiKey,
          },
        );
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });
  });
});
