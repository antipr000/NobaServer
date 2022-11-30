import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IOTPRepo } from "../repo/OTPRepo";
import { OtpMapper } from "../mapper/OtpMapper";
import { MongoDBOtpRepo } from "../repo/MongoDBOtpRepo";
import { IdentityType } from "../domain/IdentityType";
import { NotFoundException } from "@nestjs/common";
import { Otp } from "../domain/Otp";

const DEFAULT_PARTNER_ID = "partner_id";
const DEFAULT_CONSUMER_ID = "consumer_id";

describe("MongoDBOtpRepoTests", () => {
  jest.setTimeout(20000);

  let otpRepo: IOTPRepo;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;

  beforeEach(async () => {
    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    console.log("MongoMemoryServer running at: ", mongoUri);

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
      [MONGO_CONFIG_KEY]: {
        [MONGO_URI]: mongoUri,
      },
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [OtpMapper, DBProvider, MongoDBOtpRepo],
    }).compile();

    otpRepo = app.get<MongoDBOtpRepo>(MongoDBOtpRepo);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("getOtp", () => {
    it("should return an otp without ConsumerID", async () => {
      const emailID = "user@noba.com";
      const otp = 123457;
      await otpRepo.saveOTP(emailID, otp, IdentityType.consumer, DEFAULT_PARTNER_ID);
      const savedOtp = await otpRepo.getOTP(emailID, IdentityType.consumer, DEFAULT_PARTNER_ID);
      expect(savedOtp.props.emailOrPhone).toBe(emailID);
      expect(savedOtp.props.otp).toBe(otp);
    });

    it("should return an otp with ConsumerID", async () => {
      const emailID = "user@noba.com";
      const otp = 123457;
      await otpRepo.saveOTP(emailID, otp, IdentityType.consumer, DEFAULT_PARTNER_ID, DEFAULT_CONSUMER_ID);
      const savedOtp = await otpRepo.getOTP(emailID, IdentityType.consumer, DEFAULT_PARTNER_ID, DEFAULT_CONSUMER_ID);
      expect(savedOtp.props.emailOrPhone).toBe(emailID);
      expect(savedOtp.props.otp).toBe(otp);
    });
  });

  describe("saveOTPObject", () => {
    it("should save an otp object", async () => {
      const emailID = "user@noba.com";
      const otp = 123457;
      const otpObject = Otp.createOtp({
        emailOrPhone: emailID,
        otp,
        identityType: IdentityType.consumer,
        partnerID: DEFAULT_PARTNER_ID,
      });
      await otpRepo.saveOTPObject(otpObject);
      const savedOtp = await otpRepo.getOTP(emailID, IdentityType.consumer, DEFAULT_PARTNER_ID);
      expect(savedOtp.props.emailOrPhone).toBe(emailID);
      expect(savedOtp.props.otp).toBe(otp);
    });

    it("should save an otp object", async () => {
      const emailID = "user@noba.com";
      const otp = 123457;
      const otpObject = Otp.createOtp({
        emailOrPhone: emailID,
        otp,
        identityType: IdentityType.consumer,
        partnerID: DEFAULT_PARTNER_ID,
      });
      await otpRepo.saveOTPObject(otpObject);
      const savedOtp = await otpRepo.getOTP(emailID, IdentityType.consumer, DEFAULT_PARTNER_ID);
      expect(savedOtp.props.emailOrPhone).toBe(emailID);
      expect(savedOtp.props.otp).toBe(otp);
    });
  });

  describe("getAllOtpsForAUser", () => {
    it("should return all otps for a user for a given identity type", async () => {
      const emailID = "user@noba.com";
      const otp = 123457;
      const otp2 = 123456;
      const opt3 = 1342424;

      await otpRepo.saveOTP(emailID, otp, IdentityType.consumer, DEFAULT_PARTNER_ID);
      await otpRepo.saveOTP(emailID, otp2, IdentityType.consumer, DEFAULT_PARTNER_ID);
      await otpRepo.saveOTP(emailID, opt3, IdentityType.partnerAdmin, DEFAULT_PARTNER_ID);

      const savedOtps = await otpRepo.getAllOTPsForUser(emailID, IdentityType.consumer);
      expect(savedOtps.length).toBe(2);
    });

    it("should return all otps for a user for a given identity type and consumer", async () => {
      const emailID = "user@noba.com";
      const otp = 123457;
      const otp2 = 123456;
      const opt3 = 1342424;

      await otpRepo.saveOTP(emailID, otp, IdentityType.consumer, DEFAULT_PARTNER_ID, DEFAULT_CONSUMER_ID);
      await otpRepo.saveOTP(emailID, otp2, IdentityType.consumer, DEFAULT_PARTNER_ID, DEFAULT_CONSUMER_ID);
      await otpRepo.saveOTP(emailID, opt3, IdentityType.partnerAdmin, DEFAULT_PARTNER_ID);

      const savedOtps = await otpRepo.getAllOTPsForUser(emailID, IdentityType.consumer, DEFAULT_CONSUMER_ID);
      expect(savedOtps.length).toBe(2);
    });
  });

  describe("deleteOtp", () => {
    it("should delete an otp", async () => {
      const emailID = "user@noba.com";
      const otp = 123457;
      const otp2 = 123456;

      await otpRepo.saveOTP(emailID, otp, IdentityType.consumer, DEFAULT_PARTNER_ID);
      const obj = await otpRepo.getOTP(emailID, IdentityType.consumer, DEFAULT_PARTNER_ID);

      await otpRepo.deleteOTP(obj.props._id);

      let thrown = false;
      try {
        const savedOtp = await otpRepo.getOTP(emailID, IdentityType.consumer, DEFAULT_PARTNER_ID);
      } catch (ex) {
        if (ex instanceof NotFoundException) {
          thrown = true;
        }
      }
      expect(thrown).toBe(true);
    });
  });

  describe("deleteAllOTPsForAUser", () => {
    it("should delete all otps for a user", async () => {
      const emailID = "user@noba.com";
      const otp = 123457;
      const otp2 = 123456;
      const opt3 = 1342424;
      const consumerID = "1234567890";

      await otpRepo.saveOTP(emailID, otp, IdentityType.consumer, DEFAULT_PARTNER_ID);
      await otpRepo.saveOTP(emailID, otp2, IdentityType.consumer, DEFAULT_PARTNER_ID);
      await otpRepo.saveOTP(emailID, opt3, IdentityType.partnerAdmin, DEFAULT_PARTNER_ID);

      await otpRepo.deleteAllOTPsForUser(emailID, IdentityType.consumer);
      const savedOtps = await otpRepo.getAllOTPsForUser(emailID, IdentityType.consumer);
      expect(savedOtps.length).toBe(0);

      const savedOtpsForPartnerAdmin = await otpRepo.getAllOTPsForUser(emailID, IdentityType.partnerAdmin);
      expect(savedOtpsForPartnerAdmin.length).toBe(1);
    });
  });

  describe("deleteAllExpiredOtps", () => {
    it("delete all expired otps", async () => {
      const emailID = "user@noba.com";
      const otp = 123457;
      const otp2 = 123456;
      const opt3 = 1342424;
      const consumerID = "1234567890";

      await otpRepo.saveOTP(emailID, otp, IdentityType.consumer, DEFAULT_PARTNER_ID, consumerID, 100);
      await otpRepo.saveOTP(emailID, otp2, IdentityType.consumer, DEFAULT_PARTNER_ID, consumerID, 100);
      await otpRepo.saveOTP(emailID, opt3, IdentityType.consumer, DEFAULT_PARTNER_ID);
      const savedOtps = await otpRepo.getAllOTPsForUser(emailID, IdentityType.consumer);
      expect(savedOtps.length).toBe(3);
      await new Promise(r => setTimeout(r, 100));
      await otpRepo.deleteAllExpiredOTPs();
      const savedOtpsAfterDeletion = await otpRepo.getAllOTPsForUser(emailID, IdentityType.consumer);
      expect(savedOtpsAfterDeletion.length).toBe(1);
    });
  });
});
