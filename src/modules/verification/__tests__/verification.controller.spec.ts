import { TestingModule, Test } from "@nestjs/testing";
import { deepEqual, instance, when } from "ts-mockito";
import { VerificationController } from "../verification.controller";
import { VerificationService } from "../verification.service";
import { getMockVerificationServiceWithDefaults } from "../mocks/mock.verification.service";
import { VerificationData } from "../domain/VerificationData";
import { ConsumerInformation } from "../domain/ConsumerInformation";
import { ConsumerVerificationStatus } from "../../../modules/user/domain/VerificationStatus";
import { User, UserProps } from "../../../modules/user/domain/User";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";

describe("VerificationController", () => {
  let verificationController: VerificationController;
  let verificationService: VerificationService;

  jest.setTimeout(30000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };

    verificationService = getMockVerificationServiceWithDefaults();

    const VerificationServiceProvider = {
      provide: VerificationService,
      useFactory: () => instance(verificationService),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [VerificationController],
      providers: [VerificationServiceProvider],
    }).compile();

    verificationController = app.get<VerificationController>(VerificationController);
  });

  describe("verification controller tests", () => {
    it("should get supported country codes", async () => {
      when(verificationService.getCountryCodes()).thenResolve(["US", "CA"]);
      const result = await verificationController.getCountryCodes();
      expect(result.length).toBe(2);
      expect(result).toStrictEqual(["US", "CA"]);
    });

    it("should get subdivisions", async () => {
      when(verificationService.getSubdivisions("US")).thenResolve([
        {
          name: "Albama",
          code: "AL",
        },
        {
          name: "Alaska",
          code: "AK",
        },
      ]);

      const result = await verificationController.getSubdivisions("US");
      expect(result.length).toBe(2);
    });

    it("should create session", async () => {
      when(verificationService.createSession()).thenResolve(
        VerificationData.createVerificationData({
          _id: "session-code",
        }),
      );
      const result = await verificationController.createSession();
      expect(result).toBe("session-code");
    });
  });

  it("should return 'APPROVED' for consumer info verification when details are correct", async () => {
    const consumerInfo: ConsumerInformation = {
      userID: "testuser-1234",
      firstName: "Test",
      lastName: "User",
      address: {
        streetLine1: "Some random street",
        countryCode: "US",
        city: "Some random city",
        regionCode: "AL",
        postalCode: "123456",
      },
      phoneNumber: "+1234567890",
      dateOfBirth: "1990-02-12",
      email: "test@noba.com",
    };

    const user: UserProps = {
      _id: "testuser-1234",
      email: "test@noba.com",
    };

    when(
      verificationService.verifyConsumerInformation(consumerInfo.userID, "test-session", deepEqual(consumerInfo)),
    ).thenResolve({
      status: ConsumerVerificationStatus.PENDING_KYC_APPROVED,
    });

    const result = await verificationController.verifyUser(
      "test-session",
      {
        firstName: consumerInfo.firstName,
        lastName: consumerInfo.lastName,
        address: consumerInfo.address,
        phoneNumber: consumerInfo.phoneNumber,
        dateOfBirth: consumerInfo.dateOfBirth,
      },
      {
        user: User.createUser(user),
      },
    );

    expect(result.status).toBe("Approved");
  });

  it("should return 'NOT_APPROVED' for consumer info verification when details are not correct", async () => {
    const consumerInfo: ConsumerInformation = {
      userID: "testuser-1234",
      firstName: "Fake",
      lastName: "Name",
      address: {
        streetLine1: "Some random street",
        countryCode: "US",
        city: "Some random city",
        regionCode: "AL",
        postalCode: "123456",
      },
      phoneNumber: "+12222222222",
      dateOfBirth: "1990-02-12",
      email: "fake@noba.com",
    };

    const user: UserProps = {
      _id: "testuser-1234",
      email: "fake@noba.com",
    };

    when(
      verificationService.verifyConsumerInformation(consumerInfo.userID, "test-session", deepEqual(consumerInfo)),
    ).thenResolve({
      status: ConsumerVerificationStatus.NOT_APPROVED_REJECTED_KYC,
    });

    const result = await verificationController.verifyUser(
      "test-session",
      {
        firstName: consumerInfo.firstName,
        lastName: consumerInfo.lastName,
        address: consumerInfo.address,
        phoneNumber: consumerInfo.phoneNumber,
        dateOfBirth: consumerInfo.dateOfBirth,
      },
      {
        user: User.createUser(user),
      },
    );

    expect(result.status).toBe("NotApproved");
  });

  it("should return 'PENDING' for consumer info verification when user is flagged", async () => {
    const consumerInfo: ConsumerInformation = {
      userID: "testuser-1234",
      firstName: "Test",
      lastName: "User",
      address: {
        streetLine1: "Some random street",
        countryCode: "US",
        city: "Some random city",
        regionCode: "AL",
        postalCode: "123456",
      },
      phoneNumber: "+12222222222",
      dateOfBirth: "1990-02-12",
      email: "shadyemail@noba.com",
    };

    const user: UserProps = {
      _id: "testuser-1234",
      email: "shadyemail@noba.com",
    };

    when(
      verificationService.verifyConsumerInformation(consumerInfo.userID, "test-session", deepEqual(consumerInfo)),
    ).thenResolve({
      status: ConsumerVerificationStatus.PENDING_FLAGGED_KYC,
    });

    const result = await verificationController.verifyUser(
      "test-session",
      {
        firstName: consumerInfo.firstName,
        lastName: consumerInfo.lastName,
        address: consumerInfo.address,
        phoneNumber: consumerInfo.phoneNumber,
        dateOfBirth: consumerInfo.dateOfBirth,
      },
      {
        user: User.createUser(user),
      },
    );

    expect(result.status).toBe("Pending");
  });
});
