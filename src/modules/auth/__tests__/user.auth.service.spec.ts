import { JwtModule } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
import { UnauthorizedException } from "@nestjs/common";
import { consumerIdentityIdentifier } from "../domain/IdentityType";
import { STATIC_DEV_OTP } from "../../../config/ConfigurationUtils";
import { NotificationService } from "../../notifications/notification.service";
import { getMockNotificationServiceWithDefaults } from "../../notifications/mocks/mock.notification.service";
import { UserAuthService } from "../user.auth.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { Result } from "../../../core/logic/Result";
import { Utils } from "../../../core/utils/Utils";
import { ITokenRepo } from "../repo/token.repo";
import { getMockTokenRepoWithDefaults } from "../mocks/MockTokenRepo";
import { Token } from "../domain/Token";
import { OTPService } from "../../../modules/common/otp.service";
import { getMockOTPServiceWithDefaults } from "../../common/mocks/mock.otp.service";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";

describe("UserAuthService", () => {
  jest.setTimeout(5000);
  describe("Test without otp override", () => {
    let mockConsumerService: ConsumerService;
    let userAuthService: UserAuthService;
    let mockOTPService: OTPService;
    let mockTokenRepo: ITokenRepo;
    let mockNotificationService: NotificationService;

    const testJwtSecret = "TEST_SECRET";
    const identityType = consumerIdentityIdentifier;
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    beforeAll(async () => {
      mockConsumerService = getMockConsumerServiceWithDefaults();
      mockOTPService = getMockOTPServiceWithDefaults();
      mockTokenRepo = getMockTokenRepoWithDefaults();
      mockNotificationService = getMockNotificationServiceWithDefaults();

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
            provide: "TokenRepo",
            useFactory: () => instance(mockTokenRepo),
          },
          {
            provide: ConsumerService,
            useFactory: () => instance(mockConsumerService),
          },
          {
            provide: OTPService,
            useFactory: () => instance(mockOTPService),
          },
          {
            provide: NotificationService,
            useFactory: () => instance(mockNotificationService),
          },
          UserAuthService,
        ],
      }).compile();

      userAuthService = app.get<UserAuthService>(UserAuthService);
    });

    describe("validateToken", () => {
      it("should validate the token correctly", async () => {
        const rawToken = "nobatoken";
        const userID = "nobauser";
        const token = Token.createTokenObject({ id: Token.saltifyToken(rawToken, userID), userID: userID });

        when(mockTokenRepo.getToken(rawToken, userID)).thenResolve(token);

        const valid = await userAuthService.validateToken(rawToken, userID);
        expect(valid).toBe(true);
      });
      it("token shouldn't be valid", async () => {
        const rawToken = "nobatoken";
        const userID = "nobauser";
        const token = Token.createTokenObject({ id: Token.saltifyToken(rawToken, userID), userID: userID });

        when(mockTokenRepo.getToken(rawToken, userID)).thenResolve(token);

        const valid = await userAuthService.validateToken("nonexisting token", userID);
        expect(valid).toBe(false);
      });
    });

    describe("invalidateToken", () => {
      it("token should be deleted", async () => {
        const rawToken = "nobatoken";
        const userID = "nobauser";
        when(mockTokenRepo.deleteToken(rawToken, userID)).thenResolve();

        await userAuthService.invalidateToken(rawToken, userID);
      });
    });

    describe("generateAccessToken", () => {
      it("generate access token without refresh token", async () => {
        const id = "nobauser";
        const jwt = await userAuthService.generateAccessToken(id, false);
        expect(jwt.accessToken).toBeDefined();
        expect(jwt.userID).toBe(id);
        expect(jwt.refreshToken).toBe("");
      });

      it("generate access token with refresh token", async () => {
        const id = "nobauser";
        when(mockTokenRepo.saveToken(anything())).thenResolve();
        const jwt = await userAuthService.generateAccessToken(id, true);
        expect(jwt.accessToken).toBeDefined();
        expect(jwt.userID).toBe(id);
        expect(jwt.refreshToken).toBeDefined();
      });
    });

    describe("validateAndGetUserId", () => {
      it("should throw UnauthorizedException if no OTP exists for the user", async () => {
        const NO_OTP_USER = "abcd@noba.com";

        when(mockOTPService.checkIfOTPIsValidAndCleanup(NO_OTP_USER, identityType, 123456)).thenResolve(false);

        try {
          await userAuthService.validateAndGetUserId(NO_OTP_USER, 123456);
        } catch (err) {
          expect(err).toBeInstanceOf(UnauthorizedException);
        }
      });

      it("should create user if user with given email doesn't exist", async () => {
        const NON_EXISTING_USER_EMAIL = "abcd@noba.com";
        const CORRECT_OTP = 123456;
        const consumerID = "1234567890";

        when(
          mockOTPService.checkIfOTPIsValidAndCleanup(NON_EXISTING_USER_EMAIL, identityType, CORRECT_OTP),
        ).thenResolve(true);

        when(mockConsumerService.getOrCreateConsumerConditionally(NON_EXISTING_USER_EMAIL)).thenResolve(
          Consumer.createConsumer({
            id: consumerID,
            email: NON_EXISTING_USER_EMAIL,
          }),
        );

        const id = await userAuthService.validateAndGetUserId(NON_EXISTING_USER_EMAIL, CORRECT_OTP);
        expect(id).toEqual(consumerID);
      });

      it("should throw UnauthorizedException if otp is incorrect or expired", async () => {
        const EXISTING_USER_EMAIL = "abcd@noba.com";

        when(mockOTPService.checkIfOTPIsValidAndCleanup(EXISTING_USER_EMAIL, identityType, 1234567)).thenResolve(false);

        try {
          await userAuthService.validateAndGetUserId(EXISTING_USER_EMAIL, 1234567);
        } catch (err) {
          expect(err).toBeInstanceOf(UnauthorizedException);
        }
      });

      it("should return Consumer.id for correct Consumer", async () => {
        const EXISTING_USER_EMAIL = "rosie@noba.com";
        const CORRECT_OTP = 123456;

        const consumer = Consumer.createConsumer({
          id: "mock-consumer-1",
          email: EXISTING_USER_EMAIL,
        });

        when(mockConsumerService.getOrCreateConsumerConditionally(EXISTING_USER_EMAIL)).thenResolve(consumer);

        when(mockOTPService.checkIfOTPIsValidAndCleanup(EXISTING_USER_EMAIL, identityType, CORRECT_OTP)).thenResolve(
          true,
        );

        const receivedConsumerID = await userAuthService.validateAndGetUserId(EXISTING_USER_EMAIL, CORRECT_OTP);
        expect(receivedConsumerID).toEqual(consumer.props.id);
      });
    });

    describe("verifyUserExistence", () => {
      it("should return 'false' if service throws NotFoundException", async () => {
        const NON_EXISTING_USER_EMAIL = "nonuser@noba.com";

        when(mockConsumerService.findConsumerByEmailOrPhone(NON_EXISTING_USER_EMAIL)).thenResolve(
          Result.fail("Non-existent user"),
        );

        const result = await userAuthService.verifyUserExistence(NON_EXISTING_USER_EMAIL);

        expect(result).toBe(false);
      });

      it("should return 'true' if service returns true", async () => {
        const EXISTING_USER_EMAIL = "user@noba.com";

        when(mockConsumerService.findConsumerByEmailOrPhone(EXISTING_USER_EMAIL)).thenResolve(
          Result.ok(Consumer.createConsumer({ email: EXISTING_USER_EMAIL })),
        );

        const result = await userAuthService.verifyUserExistence(EXISTING_USER_EMAIL);

        expect(result).toBe(true);
      });
    });

    describe("generateOtp", () => {
      it("should return generated otp when otp override is not specified for environment", () => {
        jest.spyOn(Utils, "generateOTP").mockReturnValueOnce(12345);
        const otp = userAuthService.generateOTP();
        expect(otp).toBe(12345);
      });

      it("should return an OTP of YYMMDD format for the test user", () => {
        jest.spyOn(Date, "now").mockReturnValueOnce(new Date(2023, 1, 14).getTime());
        const otp = userAuthService.generateOTP(Utils.TEST_USER_EMAIL);
        expect(otp).toBe(230214);
      });
    });

    describe("sendOtp", () => {
      it("should create notification event with email when it is provided", async () => {
        const email = "fake+email@noba.com";
        const otp = "123456";
        when(mockNotificationService.sendNotification(anyString(), anything())).thenResolve();

        await userAuthService.sendOtp(email, otp);

        verify(
          mockNotificationService.sendNotification(
            NotificationEventType.SEND_OTP_EVENT,
            deepEqual({
              email,
              otp,
            }),
          ),
        ).once();
      });

      it("should create notification event with phone when it is provided", async () => {
        const phone = "+1234567890";
        const otp = "123456";
        when(mockNotificationService.sendNotification(anyString(), anything())).thenResolve();

        await userAuthService.sendOtp(phone, otp);

        verify(
          mockNotificationService.sendNotification(
            NotificationEventType.SEND_OTP_EVENT,
            deepEqual({
              phone,
              otp,
            }),
          ),
        ).once();
      });
    });
  });

  describe("Test with otp override for lower environments", () => {
    let mockConsumerService: ConsumerService;
    let userAuthService: UserAuthService;
    let mockOTPService: OTPService;
    let mockTokenRepo: ITokenRepo;
    let mockNotificationService: NotificationService;

    const testJwtSecret = "TEST_SECRET";

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
      [STATIC_DEV_OTP]: 222222,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    beforeEach(async () => {
      mockConsumerService = getMockConsumerServiceWithDefaults();
      mockOTPService = getMockOTPServiceWithDefaults();
      mockTokenRepo = getMockTokenRepoWithDefaults();
      mockNotificationService = getMockNotificationServiceWithDefaults();

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
            provide: ConsumerService,
            useFactory: () => instance(mockConsumerService),
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
          UserAuthService,
        ],
      }).compile();

      userAuthService = app.get<UserAuthService>(UserAuthService);
    });

    describe("generateOtp", () => {
      it("should return default otp as specified in the environment variables", () => {
        const otp = userAuthService.generateOTP();
        expect(otp).toBe(222222);
      });

      it("should return default otp as specified in the environment variables even if test user", () => {
        const otp = userAuthService.generateOTP(Utils.TEST_USER_EMAIL);
        expect(otp).toBe(222222);
      });
    });
  });
});
