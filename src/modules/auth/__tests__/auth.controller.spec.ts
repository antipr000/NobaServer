import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { anyString, instance, when } from "ts-mockito";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { AdminAuthService } from "../admin.auth.service";
import { AuthController } from "../auth.controller";
import { LoginResponseDTO } from "../dto/LoginResponse";
import { getMockAdminAuthServiceWithDefaults } from "../mocks/mock.admin.auth.service";
import { getMockUserAuthServiceWithDefaults } from "../mocks/mock.user.auth.service";
import { UserAuthService } from "../user.auth.service";
import { HeaderValidationService } from "../header.validation.service";
import { getMockHeaderValidationServiceWithDefaults } from "../mocks/mock.header.validation.service";

describe("AuthController", () => {
  jest.setTimeout(5000);

  let mockAdminAuthService: AdminAuthService;
  let mockConsumerAuthService: UserAuthService;
  let mockHeaderValidationService: HeaderValidationService;

  let authController: AuthController;

  const apiKey = "test-api-key";

  beforeEach(async () => {
    mockAdminAuthService = getMockAdminAuthServiceWithDefaults();
    mockConsumerAuthService = getMockUserAuthServiceWithDefaults();
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
          provide: HeaderValidationService,
          useFactory: () => instance(mockHeaderValidationService),
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
      const generateAccessTokenResponse: LoginResponseDTO = {
        user_id: adminId,
        access_token: "xxxxxx-yyyyyy-zzzzzz",
      };

      when(mockAdminAuthService.validateAndGetUserId(adminEmail, otp)).thenResolve(adminId);
      when(mockAdminAuthService.generateAccessToken(adminId)).thenResolve(generateAccessTokenResponse);

      const result: LoginResponseDTO = await authController.verifyOtp(
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
      const generateAccessTokenResponse: LoginResponseDTO = {
        user_id: consumerId,
        access_token: "xxxxxx-yyyyyy-zzzzzz",
      };

      when(mockConsumerAuthService.validateAndGetUserId(consumerEmail, otp)).thenResolve(consumerId);
      when(mockConsumerAuthService.generateAccessToken(consumerId)).thenResolve(generateAccessTokenResponse);

      const result: LoginResponseDTO = await authController.verifyOtp(
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

      when(mockAdminAuthService.generateOTP()).thenReturn(otp);
      when(mockAdminAuthService.saveOtp(adminEmail, otp)).thenResolve();
      when(mockAdminAuthService.sendOtp(adminEmail, otp.toString())).thenResolve();
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

      when(mockConsumerAuthService.generateOTP()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();
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

    it("should work with autoCreate set to true", async () => {
      const consumerEmail = "consumer@noba.com";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.generateOTP()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);

      await authController.loginUser(
        {
          emailOrPhone: consumerEmail,
          identityType: identityType,
          autoCreate: true,
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

      when(mockConsumerAuthService.generateOTP()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();
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

      when(mockConsumerAuthService.generateOTP()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerPhone, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerPhone, otp.toString())).thenResolve();
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

    it("should throw BadRequestException if phone used for noba admin for login", async () => {
      const phone = "+123424242";
      const identityType: string = consumerIdentityIdentifier;
      const otp = 123456;

      when(mockConsumerAuthService.generateOTP()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(phone, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(phone, otp.toString())).thenResolve();
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

      when(mockConsumerAuthService.generateOTP()).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();
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

    it("should throw 'ForbiddenException' if unregistered Consumer tries to log in with autoCreate set to false", async () => {
      const unregisteredConsumer = "rosie@noba.com";
      const identityType: string = consumerIdentityIdentifier;

      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(false);

      try {
        await authController.loginUser(
          {
            email: unregisteredConsumer,
            identityType: identityType,
            autoCreate: false,
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
  });
});
