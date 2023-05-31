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
      it("should return false if no phone otp record found", async () => {
        const phone = "+12345678901";

        when(mockOTPRepo.getOTP(phone, IdentityType.CONSUMER)).thenResolve(null);

        expect(otpService.checkIfOTPIsValidAndCleanup(phone, IdentityType.CONSUMER, 123456)).resolves.toBe(false);
      });

      it("should return false if phone otp record found but does not match", async () => {
        const phone = "+12345678901";
        const otp = OTP.createOtp({
          otpIdentifier: phone,
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(),
        });
        when(mockOTPRepo.getOTP(phone, IdentityType.CONSUMER)).thenResolve(otp);

        expect(otpService.checkIfOTPIsValidAndCleanup(phone, IdentityType.CONSUMER, 123457)).resolves.toBe(false);
      });

      it("should return true if phone otp record found and matches", async () => {
        const randomUUID = v4();
        const phone = "+12345678901";
        const otp = OTP.createOtp({
          id: randomUUID,
          otpIdentifier: phone,
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(Date.now() + 5 * 60 * 1000),
        });
        when(mockOTPRepo.getOTP(phone, IdentityType.CONSUMER)).thenResolve(otp);
        when(mockOTPRepo.deleteOTP(randomUUID)).thenResolve();
        expect(otpService.checkIfOTPIsValidAndCleanup(phone, IdentityType.CONSUMER, 123456)).resolves.toBe(true);
      });

      it("should return false if phone otp record found and matches but expired", async () => {
        const phone = "+12345678901";
        const otp = OTP.createOtp({
          otpIdentifier: phone,
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(Date.now() - 5 * 60 * 1000),
        });
        when(mockOTPRepo.getOTP(phone, IdentityType.CONSUMER)).thenResolve(otp);

        expect(otpService.checkIfOTPIsValidAndCleanup(phone, IdentityType.CONSUMER, 123456)).resolves.toBe(false);
      });

      it("should strip non phone chars from phone otpIdentifier", async () => {
        const phone = "+12345678901";
        const otp = OTP.createOtp({
          otpIdentifier: phone,
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(Date.now() + 5 * 60 * 1000),
        });
        when(mockOTPRepo.getOTP(phone, IdentityType.CONSUMER)).thenResolve(otp);
        when(mockOTPRepo.deleteOTP(otp.props.id)).thenResolve();

        expect(
          otpService.checkIfOTPIsValidAndCleanup("+1-(234) 567-8901", IdentityType.CONSUMER, 123456),
        ).resolves.toBe(true);
      });

      it("should return false if no email otp record found", async () => {
        const email = "fake@fake.com";
        when(mockOTPRepo.getOTP(email, IdentityType.CONSUMER)).thenResolve(null);

        expect(otpService.checkIfOTPIsValidAndCleanup(email, IdentityType.CONSUMER, 123456)).resolves.toBe(false);
      });

      it("should return false if email otp record found but does not match", async () => {
        const email = "fake@fake.com";

        const otp = OTP.createOtp({
          otpIdentifier: email,
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(),
        });
        when(mockOTPRepo.getOTP(email, IdentityType.CONSUMER)).thenResolve(otp);

        expect(otpService.checkIfOTPIsValidAndCleanup(email, IdentityType.CONSUMER, 123457)).resolves.toBe(false);
      });

      it("should return true if email otp record found and matches", async () => {
        const randomUUID = v4();
        const email = "fake@fake.com";

        const otp = OTP.createOtp({
          id: randomUUID,
          otpIdentifier: email,
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(Date.now() + 5 * 60 * 1000),
        });

        when(mockOTPRepo.getOTP(email, IdentityType.CONSUMER)).thenResolve(otp);
        when(mockOTPRepo.deleteOTP(randomUUID)).thenResolve();

        expect(otpService.checkIfOTPIsValidAndCleanup(email, IdentityType.CONSUMER, 123456)).resolves.toBe(true);
      });

      it("should return false if email otp record found and matches but expired", async () => {
        const email = "fake@fake.com";
        const otp = OTP.createOtp({
          otpIdentifier: email,
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(Date.now() - 5 * 60 * 1000),
        });
        when(mockOTPRepo.getOTP(email, IdentityType.CONSUMER)).thenResolve(otp);

        expect(otpService.checkIfOTPIsValidAndCleanup(email, IdentityType.CONSUMER, 123456)).resolves.toBe(false);
      });

      it("should strip spaces from email otpIdentifier", async () => {
        const email = "fake@fake.com";
        const otp = OTP.createOtp({
          otpIdentifier: email,
          identityType: IdentityType.CONSUMER,
          otp: 123456,
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          otpExpirationTimestamp: new Date(Date.now() + 5 * 60 * 1000),
        });
        when(mockOTPRepo.getOTP(email, IdentityType.CONSUMER)).thenResolve(otp);
        when(mockOTPRepo.deleteOTP(otp.props.id)).thenResolve();

        expect(
          otpService.checkIfOTPIsValidAndCleanup("  fake@fake.com  ", IdentityType.CONSUMER, 123456),
        ).resolves.toBe(true);
      });
    });

    describe("saveOTP", () => {
      it("should save phone otp", async () => {
        const phone = "+12345678901";

        when(mockOTPRepo.saveOTP(phone, 123456, IdentityType.CONSUMER)).thenResolve();
        when(mockOTPRepo.deleteAllOTPsForIdentifier(phone, IdentityType.CONSUMER)).thenResolve();

        expect(otpService.saveOTP(phone, IdentityType.CONSUMER, 123456)).resolves.toBeUndefined();
      });

      it("should strip non phone chars from phone otpIdentifier", async () => {
        const phone = "+12345678901";
        when(mockOTPRepo.saveOTP(phone, 123456, IdentityType.CONSUMER)).thenResolve();
        when(mockOTPRepo.deleteAllOTPsForIdentifier(phone, IdentityType.CONSUMER)).thenResolve();

        expect(otpService.saveOTP("+1-(234) 567-8901", IdentityType.CONSUMER, 123456)).resolves.toBeUndefined();
      });
    });

    it("should save email otp", async () => {
      const email = "fake@fake.com";
      when(mockOTPRepo.saveOTP(email, 123456, IdentityType.CONSUMER)).thenResolve();
      when(mockOTPRepo.deleteAllOTPsForIdentifier(email, IdentityType.CONSUMER)).thenResolve();

      expect(otpService.saveOTP(email, IdentityType.CONSUMER, 123456)).resolves.toBeUndefined();
    });

    it("should strip spaces from email otpIdentifier", async () => {
      const email = "fake@fake.com";
      when(mockOTPRepo.saveOTP(email, 123456, IdentityType.CONSUMER)).thenResolve();
      when(mockOTPRepo.deleteAllOTPsForIdentifier(email, IdentityType.CONSUMER)).thenResolve();

      expect(otpService.saveOTP("   fake@fake.com  ", IdentityType.CONSUMER, 123456)).resolves.toBeUndefined();
    });
  });
});
