import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IdentificationService } from "../identifications.service";

describe("Identification", () => {
  let identificationService: IdentificationService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
      IDENTIFICATION_TYPES_FILE_PATH: __dirname.split("src")[0] + "/appconfigs/identification-types.json",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [IdentificationService],
    }).compile();

    identificationService = app.get<IdentificationService>(IdentificationService);
  });

  describe("Identification service tests", () => {
    it("should return identification types", async () => {
      const identificationTypes = await identificationService.getIdentificationTypes();
      expect(identificationTypes.length).toBeGreaterThan(0);
    });
  });
});
