import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { anyString, instance, verify, when } from "ts-mockito";
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
import { NewAccessTokenRequestDTO } from "../dto/NewAccessTokenRequest";

describe("AuthController", () => {
  jest.setTimeout(5000);

  let mockAdminAuthService: AdminAuthService;
  let mockConsumerAuthService: UserAuthService;
  let mockHeaderValidationService: HeaderValidationService;

  let authController: AuthController;

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

  describe("newAccessToken", () => {
    it("it should return new access token assuming refresh token valid", async () => {
      const consumerId = "1111111111";
      const token = "nobatoken";
      const request: NewAccessTokenRequestDTO = {
        userID: consumerId,
        refreshToken: token,
      };

      const generateAccessTokenResponse: LoginResponseDTO = {
        userID: consumerId,
        accessToken: "xxxxxx-yyyyyy-zzzzzz",
        refreshToken: "new-refresh-token",
      };

      when(mockConsumerAuthService.validateToken(token, consumerId)).thenResolve(true);
      when(mockConsumerAuthService.invalidateToken(token, consumerId)).thenResolve();
      when(mockConsumerAuthService.generateAccessToken(consumerId, true)).thenResolve(generateAccessTokenResponse);

      const result: LoginResponseDTO = await authController.newAccessToken(request);

      expect(result).toEqual(generateAccessTokenResponse);
    });

    it("it should throw unauthorized exception if token is not valid", async () => {
      const consumerId = "1111111111";
      const token = "nobatoken";
      const request: NewAccessTokenRequestDTO = {
        userID: consumerId,
        refreshToken: token,
      };

      when(mockConsumerAuthService.validateToken(token, consumerId)).thenResolve(false);

      try {
        await authController.newAccessToken(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    });
  });

  describe("verifyOtp", () => {
    it("should use 'UserAuthService'", async () => {
      const consumerId = "1111111111";
      const consumerEmail = "consumer@noba.com";
      const otp = 123456;
      const generateAccessTokenResponse: LoginResponseDTO = {
        userID: consumerId,
        accessToken: "xxxxxx-yyyyyy-zzzzzz",
      };

      when(mockConsumerAuthService.validateAndGetUserId(consumerEmail, otp)).thenResolve(consumerId);
      when(mockConsumerAuthService.generateAccessToken(consumerId, false)).thenResolve(generateAccessTokenResponse);

      const result: LoginResponseDTO = await authController.verifyOtp({
        emailOrPhone: consumerEmail,
        otp: otp,
        includeRefreshToken: false,
      });

      expect(result).toEqual(generateAccessTokenResponse);
    });
  });

  describe("login", () => {
    it("should use 'UserAuthService'", async () => {
      const consumerEmail = "consumer@noba.com";
      const otp = 123456;

      when(mockConsumerAuthService.generateOTP(consumerEmail)).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);

      await authController.loginUser({
        emailOrPhone: consumerEmail,
      });

      verify(mockConsumerAuthService.verifyUserExistence(consumerEmail)).once();
    });

    it("should work with autoCreate set to true", async () => {
      const consumerEmail = "consumer@noba.com";
      const otp = 123456;

      when(mockConsumerAuthService.generateOTP(consumerEmail)).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(false);

      await authController.loginUser({
        emailOrPhone: consumerEmail,
        autoCreate: true,
      });
    });

    it("should work with emailOrPhoneAttribute too, with email as input", async () => {
      const consumerEmail = "consumer@noba.com";
      const otp = 123456;

      when(mockConsumerAuthService.generateOTP(consumerEmail)).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerEmail, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerEmail, otp.toString())).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);

      await authController.loginUser({
        emailOrPhone: consumerEmail,
      });

      verify(mockConsumerAuthService.verifyUserExistence(consumerEmail)).once();
    });

    it("should work with emailOrPhoneAttribute too, with phone as input", async () => {
      const consumerPhone = "+1242425252";
      const otp = 123456;

      when(mockConsumerAuthService.generateOTP(consumerPhone)).thenReturn(otp);
      when(mockConsumerAuthService.saveOtp(consumerPhone, otp)).thenResolve();
      when(mockConsumerAuthService.sendOtp(consumerPhone, otp.toString())).thenResolve();
      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);

      await authController.loginUser({
        emailOrPhone: consumerPhone,
      });
      verify(mockConsumerAuthService.verifyUserExistence(consumerPhone)).once();
    });

    it("should throw 'ForbiddenException' if unregistered Consumer tries to log in with autoCreate set to false", async () => {
      const unregisteredConsumer = "rosie@noba.com";

      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(false);
      expect(
        async () =>
          await authController.loginUser({
            emailOrPhone: unregisteredConsumer,
            autoCreate: false,
          }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw 'ForbiddenException' if registered Consumer tries to log in with autoCreate set to true", async () => {
      const unregisteredConsumer = "rosie@noba.com";

      when(mockConsumerAuthService.verifyUserExistence(anyString())).thenResolve(true);
      expect(
        async () =>
          await authController.loginUser({
            emailOrPhone: unregisteredConsumer,
            autoCreate: true,
          }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("loginAdmin", () => {
    it("should throw 'ForbiddenException' if unregistered Admin tries to log in", async () => {
      const unregisteredAdmin = "rosie@noba.com";

      when(mockAdminAuthService.verifyUserExistence(anyString())).thenResolve(false);

      expect(
        async () =>
          await authController.loginAdmin({
            emailOrPhone: unregisteredAdmin,
          }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should use 'AdminAuthService'", async () => {
      const adminEmail = "rosie@noba.com";
      const otp = 123456;

      when(mockAdminAuthService.generateOTP(adminEmail)).thenReturn(otp);
      when(mockAdminAuthService.saveOtp(adminEmail, otp)).thenResolve();
      when(mockAdminAuthService.sendOtp(adminEmail, otp.toString())).thenResolve();
      when(mockAdminAuthService.verifyUserExistence(anyString())).thenResolve(true);

      await authController.loginAdmin({
        emailOrPhone: adminEmail,
      });

      verify(mockAdminAuthService.verifyUserExistence(adminEmail)).once();
    });
  });

  describe("verifyAdminOtp", () => {
    it("should use 'AdminAuthService'", async () => {
      const adminId = "1111111111";
      const adminEmail = "rosie@noba.com";
      const otp = 123456;

      const generateAccessTokenResponse: LoginResponseDTO = {
        userID: adminId,
        accessToken: "fake-token",
      };
      when(mockAdminAuthService.validateAndGetUserId(adminEmail, otp)).thenResolve(adminId);
      when(mockAdminAuthService.generateAccessToken(adminId, false)).thenResolve(generateAccessTokenResponse);

      const result: LoginResponseDTO = await authController.verifyAdminOtp({
        emailOrPhone: adminEmail,
        otp: otp,
      });

      expect(result).toEqual(generateAccessTokenResponse);
    });
  });
});
