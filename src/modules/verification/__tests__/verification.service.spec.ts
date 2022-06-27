import { TestingModule, Test } from "@nestjs/testing";
import { anything, instance, when } from "ts-mockito";
import { VerificationService } from "../verification.service";
import { VerificationData } from "../domain/VerificationData";
import { IVerificationDataRepo } from "../repos/IVerificationDataRepo";
import { IDVProvider } from "../integrations/IDVProvider";
import { getMockVerificationRepoWithDefaults } from "../mocks/mock.verification.repo";
import { getMockIdvProviderIntegrationWithDefaults } from "../mocks/mock.idvprovider.integration";
import { UserService } from "../../../modules/user/user.service";
import { mockedUserService } from "../../../modules/user/mocks/userservicemock";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";

describe("VerificationService", () => {
  let verificationService: VerificationService;
  let verificationRepo: IVerificationDataRepo;
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

    const verificationDataRepoProvider = {
      provide: "VerificationDataRepo",
      useFactory: () => instance(verificationRepo),
    };

    const idvIntegratorProvider = {
      provide: "IDVProvider",
      useFactory: () => instance(idvProvider),
    };

    const userServiceProvider = {
      provide: UserService,
      useFactory: () => instance(mockedUserService),
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
});
