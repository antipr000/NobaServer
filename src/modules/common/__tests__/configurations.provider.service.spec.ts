import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { ConfigurationProviderService } from "../configuration.provider.service";
import { ConfigurationsDTO } from "../dto/ConfigurationsDTO";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("ConfigurationsProviderService", () => {
  let configurationProviderService: ConfigurationProviderService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          configuration: {
            lowAmountThreshold: 50,
            highAmountThreshold: 200,
            cryptoImageBaseUrl: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto",
            fiatImageBaseUrl: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [ConfigurationProviderService],
    }).compile();

    configurationProviderService = app.get<ConfigurationProviderService>(ConfigurationProviderService);
  });

  describe("ConfigurationProvider service tests", () => {
    it("should return common configurations", async () => {
      const configurations: ConfigurationsDTO = configurationProviderService.getConfigurations();

      expect(configurations.lowAmountThreshold).toBe(50);
      expect(configurations.highAmountThreshold).toBe(200);
      expect(configurations.cryptoImageBaseUrl).toBe(
        "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto",
      );
      expect(configurations.fiatImageBaseUrl).toBe(
        "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat",
      );
    });
  });
});
