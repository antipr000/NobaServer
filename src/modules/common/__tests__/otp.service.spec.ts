import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { OTPService } from "../otp.service";
import { IOTPRepo } from "../repo/otp.repo";
import { getMockOTPRepoWithDefaults } from "../mocks/mock.otp.repo";
import { IdentityType } from "../../../modules/auth/domain/IdentityType";
import { instance, when } from "ts-mockito";
import { OTP } from "../domain/OTP";
import { v4 } from "uuid";

describe("OTPService", () => {
  let otpService: OTPService;
  let mockOTPRepo: IOTPRepo;

  jest.setTimeout(30000);

  beforeEach(async () => {
    mockOTPRepo = getMockOTPRepoWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        OTPService,
        {
          provide: "OTPRepo",
          useFactory: () => instance(mockOTPRepo),
        },
      ],
    }).compile();

    otpService = app.get<OTPService>(OTPService);
  });

  describe("OTP Service tests", () => {
    describe("checkIfOTPIsValidAndCleanup", () => {
      it("should return false if no otp record found", async () => {
        when(mockOTPRepo.getOTP("+1234567890", IdentityType.CONSUMER)).thenResolve(null);

        const result = await otpService.checkIfOTPIsValidAndCleanup("+1234567890", IdentityType.CONSUMER, 123456);

        expect(result).toBe(false);
      });

      it("should return false if otp record found but does not match", async () => {
        const otp = OTP.createOtp({
          otpIdentifier: "+1234567890",
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(),
        });
        when(mockOTPRepo.getOTP("+1234567890", IdentityType.CONSUMER)).thenResolve(otp);

        const result = await otpService.checkIfOTPIsValidAndCleanup("+1234567890", IdentityType.CONSUMER, 123457);

        expect(result).toBe(false);
      });

      it("should return true if otp record found and matches", async () => {
        const randomUUID = v4();
        const otp = OTP.createOtp({
          id: randomUUID,
          otpIdentifier: "+1234567890",
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(Date.now() + 5 * 60 * 1000),
        });
        when(mockOTPRepo.getOTP("+1234567890", IdentityType.CONSUMER)).thenResolve(otp);
        when(mockOTPRepo.deleteOTP(randomUUID)).thenResolve();
        const result = await otpService.checkIfOTPIsValidAndCleanup("+1234567890", IdentityType.CONSUMER, 123456);

        expect(result).toBe(true);
      });

      it("should return false if otp record found and matches but expired", async () => {
        const otp = OTP.createOtp({
          otpIdentifier: "+1234567890",
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(Date.now() - 5 * 60 * 1000),
        });
        when(mockOTPRepo.getOTP("+1234567890", IdentityType.CONSUMER)).thenResolve(otp);

        const result = await otpService.checkIfOTPIsValidAndCleanup("+1234567890", IdentityType.CONSUMER, 123456);

        expect(result).toBe(false);
      });

      it("should strip non phone chars from otpIdentifier", async () => {
        const otp = OTP.createOtp({
          otpIdentifier: "+12345678901",
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(Date.now() + 5 * 60 * 1000),
        });
        when(mockOTPRepo.getOTP("+12345678901", IdentityType.CONSUMER)).thenResolve(otp);
        when(mockOTPRepo.deleteOTP(otp.props.id)).thenResolve();

        expect(
          otpService.checkIfOTPIsValidAndCleanup("+1-(234) 567-8901", IdentityType.CONSUMER, 123456),
        ).resolves.toBe(true);
      });
    });

    describe("saveOTP", () => {
      it("should save otp", async () => {
        when(mockOTPRepo.saveOTP("+1234567890", 123456, IdentityType.CONSUMER)).thenResolve();
        when(mockOTPRepo.deleteAllOTPsForIdentifier("+1234567890", IdentityType.CONSUMER)).thenResolve();

        expect(otpService.saveOTP("+1234567890", IdentityType.CONSUMER, 123456)).resolves.toBeUndefined();
      });

      it("should strip non phone chars from otpIdentifier", async () => {
        when(mockOTPRepo.saveOTP("+1234567890", 123456, IdentityType.CONSUMER)).thenResolve();
        when(mockOTPRepo.deleteAllOTPsForIdentifier("+1234567890", IdentityType.CONSUMER)).thenResolve();

        expect(otpService.saveOTP("+1-(234) 567-890", IdentityType.CONSUMER, 123456)).resolves.toBeUndefined();
      });
    });
  });
});
