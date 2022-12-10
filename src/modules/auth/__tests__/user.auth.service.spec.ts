import { JwtModule } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { getMockSmsServiceWithDefaults } from "../../common/mocks/mock.sms.service";
import { SMSService } from "../../common/sms.service";
import { instance, when } from "ts-mockito";
import { getMockOtpRepoWithDefaults } from "../mocks/MockOtpRepo";
import { IOTPRepo } from "../repo/OTPRepo";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { consumerIdentityIdentifier } from "../domain/IdentityType";
import { Otp } from "../domain/Otp";
import { NOBA_CONFIG_KEY, NOBA_PARTNER_ID, STATIC_DEV_OTP } from "../../../config/ConfigurationUtils";
import { NotificationService } from "../../notifications/notification.service";
import { getMockNotificationServiceWithDefaults } from "../../notifications/mocks/mock.notification.service";
import { UserAuthService } from "../user.auth.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { Result } from "../../../core/logic/Result";
import { Utils } from "../../../core/utils/Utils";

describe("UserAuthService", () => {
  jest.setTimeout(5000);
  describe("Test without otp override", () => {
    let mockConsumerService: ConsumerService;
    let userAuthService: UserAuthService;
    let mockOtpRepo: IOTPRepo;
    let mockNotificationService: NotificationService;
    let mockSmsService: SMSService;

    const testJwtSecret = "TEST_SECRET";
    const identityType: string = consumerIdentityIdentifier;
    const nobaPartnerID = "NOBA_PARTNER_ID";

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
      mockConsumerService = getMockConsumerServiceWithDefaults();
      mockOtpRepo = getMockOtpRepoWithDefaults();
      mockNotificationService = getMockNotificationServiceWithDefaults();
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
            provide: ConsumerService,
            useFactory: () => instance(mockConsumerService),
          },
          {
            provide: "OTPRepo",
            useFactory: () => instance(mockOtpRepo),
          },
          {
            provide: NotificationService,
            useFactory: () => instance(mockNotificationService),
          },
          {
            provide: SMSService,
            useFactory: () => instance(mockSmsService),
          },
          UserAuthService,
        ],
      }).compile();

      userAuthService = app.get<UserAuthService>(UserAuthService);
    });

    describe("validateAndGetUserId", () => {
      it("should throw NotFoundException if no OTP exists for the user", async () => {
        const NO_OTP_USER = "abcd@noba.com";

        when(mockOtpRepo.getOTP(NO_OTP_USER, identityType)).thenReject(new NotFoundException());

        try {
          await userAuthService.validateAndGetUserId(NO_OTP_USER, 123456);
        } catch (err) {
          expect(err).toBeInstanceOf(NotFoundException);
        }
      });

      it("should create user if user with given email doesn't exist", async () => {
        const NON_EXISTING_USER_EMAIL = "abcd@noba.com";
        const CORRECT_OTP = 123456;
        const TOMORROW_EXPIRY = new Date(new Date().getTime() + 3600 * 24 * 1000);
        const consumerID = "1234567890";

        const otpDomain: Otp = Otp.createOtp({
          _id: "1",
          emailOrPhone: NON_EXISTING_USER_EMAIL,
          otp: CORRECT_OTP,
          otpExpiryTime: TOMORROW_EXPIRY.getTime(),
          identityType: consumerIdentityIdentifier,
        });

        when(mockOtpRepo.getOTP(NON_EXISTING_USER_EMAIL, identityType)).thenResolve(otpDomain);
        when(mockOtpRepo.deleteOTP("1")).thenResolve();

        when(mockConsumerService.getOrCreateConsumerConditionally(NON_EXISTING_USER_EMAIL)).thenResolve(
          Consumer.createConsumer({
            _id: consumerID,
            email: NON_EXISTING_USER_EMAIL,
          }),
        );

        const id = await userAuthService.validateAndGetUserId(NON_EXISTING_USER_EMAIL, CORRECT_OTP);
        expect(id).toEqual(consumerID);
      });

      it("should throw UnauthorizedException if otp is incorrect", async () => {
        const EXISTING_USER_EMAIL = "abcd@noba.com";
        const CORRECT_OTP = 123456;
        const TOMORROW_EXPIRY = new Date(new Date().getTime() + 3600 * 24 * 1000);

        const otpDomain: Otp = Otp.createOtp({
          _id: "1",
          emailOrPhone: EXISTING_USER_EMAIL,
          otp: CORRECT_OTP,
          otpExpiryTime: TOMORROW_EXPIRY.getTime(),
          identityType: consumerIdentityIdentifier,
        });
        when(mockOtpRepo.getOTP(EXISTING_USER_EMAIL, identityType)).thenResolve(otpDomain);

        try {
          await userAuthService.validateAndGetUserId(EXISTING_USER_EMAIL, 1234567);
        } catch (err) {
          expect(err).toBeInstanceOf(UnauthorizedException);
        }
      });

      it("should throw UnauthorizedException if otp is expired", async () => {
        const EXISTING_USER_EMAIL = "abcd@noba.com";
        const CORRECT_OTP = 123456;
        const YESTERDAY_EXPIRY = new Date(new Date().getTime() - 3600 * 24 * 1000);

        const otpDomain: Otp = Otp.createOtp({
          _id: "1",
          emailOrPhone: EXISTING_USER_EMAIL,
          otp: CORRECT_OTP,
          otpExpiryTime: YESTERDAY_EXPIRY.getTime(),
          identityType: consumerIdentityIdentifier,
        });
        when(mockOtpRepo.getOTP(EXISTING_USER_EMAIL, identityType)).thenResolve(otpDomain);

        try {
          await userAuthService.validateAndGetUserId(EXISTING_USER_EMAIL, CORRECT_OTP);
          expect(true).toBe(false);
        } catch (err) {
          expect(err).toBeInstanceOf(UnauthorizedException);
        }
      });

      it("should return Consumer._id for correct Consumer", async () => {
        const EXISTING_USER_EMAIL = "rosie@noba.com";
        const CORRECT_OTP = 123456;
        const TOMORROW_EXPIRY = new Date(new Date().getTime() + 3600 * 24 * 1000);

        const consumer = Consumer.createConsumer({
          _id: "mock-consumer-1",
          email: EXISTING_USER_EMAIL,
        });

        when(mockConsumerService.getOrCreateConsumerConditionally(EXISTING_USER_EMAIL)).thenResolve(consumer);

        const otpDomain: Otp = Otp.createOtp({
          _id: "1",
          emailOrPhone: EXISTING_USER_EMAIL,
          otp: CORRECT_OTP,
          otpExpiryTime: TOMORROW_EXPIRY.getTime(),
          identityType: consumerIdentityIdentifier,
        });
        when(mockOtpRepo.getOTP(EXISTING_USER_EMAIL, identityType)).thenResolve(otpDomain);

        when(mockOtpRepo.deleteOTP("1")).thenResolve();

        const receivedConsumerID = await userAuthService.validateAndGetUserId(EXISTING_USER_EMAIL, CORRECT_OTP);
        expect(receivedConsumerID).toEqual(consumer.props._id);
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
    });
  });

  describe("Test with otp override for lower environments", () => {
    let mockConsumerService: ConsumerService;
    let userAuthService: UserAuthService;
    let mockOtpRepo: IOTPRepo;
    let mockNotificationService: NotificationService;
    let mockSmsService: SMSService;

    const testJwtSecret = "TEST_SECRET";
    const nobaPartnerID = "NOBA_PARTNER_ID";

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
      [STATIC_DEV_OTP]: 222222,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    beforeEach(async () => {
      mockConsumerService = getMockConsumerServiceWithDefaults();
      mockOtpRepo = getMockOtpRepoWithDefaults();
      mockNotificationService = getMockNotificationServiceWithDefaults();
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
            provide: ConsumerService,
            useFactory: () => instance(mockConsumerService),
          },
          {
            provide: "OTPRepo",
            useFactory: () => instance(mockOtpRepo),
          },
          {
            provide: NotificationService,
            useFactory: () => instance(mockNotificationService),
          },
          {
            provide: SMSService,
            useFactory: () => instance(mockSmsService),
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
    });
  });
});
