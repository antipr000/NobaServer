import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IOTPRepo } from "../repo/OTPRepo";
import { SQLOTPRepo } from "../repo/SQLOTPRepo";
import { IdentityType } from "../../auth/domain/IdentityType";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { BadRequestError } from "../../../core/exception/CommonAppException";

describe("OtpRepoTests", () => {
  jest.setTimeout(20000);

  let otpRepo: IOTPRepo;
  let prismaService: PrismaService;
  let app: TestingModule;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SQLOTPRepo],
    }).compile();

    otpRepo = app.get<SQLOTPRepo>(SQLOTPRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prismaService.otp.deleteMany();
  });

  describe("getOtp", () => {
    it("should return an otp without ConsumerID", async () => {
      const emailID = getRandomEmail();
      const otp = 123457;
      await otpRepo.saveOTP(emailID, otp, IdentityType.CONSUMER);
      const savedOtp = await otpRepo.getOTP(emailID, IdentityType.CONSUMER);
      expect(savedOtp.props.otpIdentifier).toBe(emailID);
      expect(savedOtp.props.otp).toBe(otp);
    });
  });

  describe("saveOTPObject", () => {
    it("should save an otp object", async () => {
      const emailID = getRandomEmail();
      const otp = 123457;

      await otpRepo.saveOTP(emailID, otp, IdentityType.CONSUMER);
      const savedOtp = await otpRepo.getOTP(emailID, IdentityType.CONSUMER);
      expect(savedOtp.props.otpIdentifier).toBe(emailID);
      expect(savedOtp.props.otp).toBe(otp);
    });

    it("should throw error when otp for email already exists and identity type is same", async () => {
      const emailID = getRandomEmail();
      const otp = 123457;

      await otpRepo.saveOTP(emailID, otp, IdentityType.CONSUMER);
      expect(async () => await otpRepo.saveOTP(emailID, 123456, IdentityType.CONSUMER)).rejects.toThrow(
        BadRequestError,
      );
    });

    it("should not throw error when otp for email already exists and identity type is different", async () => {
      const emailID = getRandomEmail();
      const otp = 123457;

      await otpRepo.saveOTP(emailID, otp, IdentityType.CONSUMER);
      await otpRepo.saveOTP(emailID, 123456, IdentityType.NOBA_ADMIN);

      let savedOtp = await otpRepo.getOTP(emailID, IdentityType.NOBA_ADMIN);
      expect(savedOtp.props.otp).toBe(123456);

      savedOtp = await otpRepo.getOTP(emailID, IdentityType.CONSUMER);
      expect(savedOtp.props.otp).toBe(otp);
    });
  });

  describe("deleteOtp", () => {
    it("should delete an otp", async () => {
      const emailID = getRandomEmail();
      const otp = 123457;

      await otpRepo.saveOTP(emailID, otp, IdentityType.CONSUMER);
      const obj = await otpRepo.getOTP(emailID, IdentityType.CONSUMER);

      await otpRepo.deleteOTP(obj.props.id);

      const savedOtp = await otpRepo.getOTP(emailID, IdentityType.CONSUMER);
      expect(savedOtp).toBeNull();
    });
  });
});

function getRandomEmail(): string {
  return `${uuid()}_${new Date().valueOf()}@noba.com`;
}
