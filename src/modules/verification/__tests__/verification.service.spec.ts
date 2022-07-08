import { TestingModule, Test } from "@nestjs/testing";
import { anything, instance, when } from "ts-mockito";
import { VerificationService } from "../verification.service";
import { VerificationData } from "../domain/VerificationData";
import { IVerificationDataRepo } from "../repos/IVerificationDataRepo";
import { IDVProvider } from "../integrations/IDVProvider";
import { getMockVerificationRepoWithDefaults } from "../mocks/mock.verification.repo";
import { getMockIdvProviderIntegrationWithDefaults } from "../mocks/mock.idvprovider.integration";
import { ConsumerService } from "../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../consumer/mocks/mock.consumer.service";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { ConsumerInformation } from "../domain/ConsumerInformation";
import { BadRequestException } from "@nestjs/common";

describe("VerificationService", () => {
  let verificationService: VerificationService;
  let verificationRepo: IVerificationDataRepo;
  let consumerService: ConsumerService;
  let idvProvider: IDVProvider;

  jest.setTimeout(30000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
      TruliooIDVApiKey: "UGVyZWdyaW5lX1NhbmRib3hfSURWX0FQSV8yOkNvZGVuYW1lZ29kQDEyMzQ=",
      TruliooDocVApiKey: "UGVyZWdyaW5lX1NhbmRib3hfRG9jVl9BUElfMjpDb2RlbmFtZWdvZEAxMjM0",
    };

    verificationRepo = getMockVerificationRepoWithDefaults();
    idvProvider = getMockIdvProviderIntegrationWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();

    const verificationDataRepoProvider = {
      provide: "VerificationDataRepo",
      useFactory: () => instance(verificationRepo),
    };

    const idvIntegratorProvider = {
      provide: "IDVProvider",
      useFactory: () => instance(idvProvider),
    };

    const userServiceProvider = {
      provide: ConsumerService,
      useFactory: () => instance(consumerService),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          trulioo: {
            TruliooIDVApiKey: "UGVyZWdyaW5lX1NhbmRib3hfSURWX0FQSV8yOkNvZGVuYW1lZ29kQDEyMzQ=",
            TruliooDocVApiKey: "UGVyZWdyaW5lX1NhbmRib3hfRG9jVl9BUElfMjpDb2RlbmFtZWdvZEAxMjM0",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [verificationDataRepoProvider, idvIntegratorProvider, VerificationService, userServiceProvider],
    }).compile();

    verificationService = app.get<VerificationService>(VerificationService);
  });

  describe("verification service tests", () => {
    it("should return session information", async () => {
      when(verificationRepo.saveVerificationData(anything())).thenResolve(
        VerificationData.createVerificationData({
          _id: "test-session",
        }),
      );

      const result = await verificationService.createSession();
      expect(result.props._id).toBe("test-session");
    });
  });

  it("should throw error for invalid dateOfBirth format in verifyConsumerInformation", async () => {
    const testConsumerInformation: ConsumerInformation = {
      userID: "test-consumer-01",
      firstName: "Test",
      lastName: "Consumer",
      address: {
        streetLine1: "Test street",
        countryCode: "US",
        city: "Sunnyvale",
        regionCode: "CA",
        postalCode: "123456",
      },
      dateOfBirth: "2020-2-1",
      email: "consumer@noba.com",
    };

    try {
      await verificationService.verifyConsumerInformation(
        testConsumerInformation.userID,
        "session-1234",
        testConsumerInformation,
      );
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
    }
  });

  it("should throw error for invalid dateOfBirth value in verifyConsumerInformation", async () => {
    const testConsumerInformation: ConsumerInformation = {
      userID: "test-consumer-01",
      firstName: "Test",
      lastName: "Consumer",
      address: {
        streetLine1: "Test street",
        countryCode: "US",
        city: "Sunnyvale",
        regionCode: "CA",
        postalCode: "123456",
      },
      dateOfBirth: "ABCD1234",
      email: "consumer@noba.com",
    };

    try {
      await verificationService.verifyConsumerInformation(
        testConsumerInformation.userID,
        "session-1234",
        testConsumerInformation,
      );
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
    }
  });

  it("should throw error for valid dateOfBirth format but invalid date in verifyConsumerInformation", async () => {
    const testConsumerInformation: ConsumerInformation = {
      userID: "test-consumer-01",
      firstName: "Test",
      lastName: "Consumer",
      address: {
        streetLine1: "Test street",
        countryCode: "US",
        city: "Sunnyvale",
        regionCode: "CA",
        postalCode: "123456",
      },
      dateOfBirth: "2020-02-30",
      email: "consumer@noba.com",
    };

    try {
      await verificationService.verifyConsumerInformation(
        testConsumerInformation.userID,
        "session-1234",
        testConsumerInformation,
      );
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
    }
  });
});
