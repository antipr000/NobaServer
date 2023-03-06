import { Test, TestingModule } from "@nestjs/testing";
import { join } from "path";
import { AWS_ACCESS_KEY_ID_ATTR, AWS_SECRET_ACCESS_KEY_ATTR } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { readConfigsFromYamlFiles } from "../../../core/utils/YamlJsonUtils";
import { TemplateService } from "../handlebar.service";

describe("HandlebarService", () => {
  let handlebarService: TemplateService;
  let app: TestingModule;

  jest.setTimeout(30000);

  beforeAll(async () => {
    let configs = {
      ASSETS_BUCKET_NAME: "prod-noba-assets",
      GENERATED_DATA_BUCKET_NAME: "noba-generated-data",
      INVOICES_FOLDER_BUCKET_PATH: "lowers/invoices",
      TEMPLATES_FOLDER_BUCKET_PATH: "assets/templates",
      AWS_ACCESS_KEY_ID: null,
      AWS_SECRET_ACCESS_KEY: null,
    };

    if (process.env["AWS_ACCESS_KEY_ID"]) {
      configs = {
        ...configs,
        AWS_ACCESS_KEY_ID: process.env["AWS_ACCESS_KEY_ID"],
        AWS_SECRET_ACCESS_KEY: process.env["AWS_SECRET_ACCESS_KEY"],
      };
    } else {
      const appConfigsDirectory = join(__dirname, "../../../../appconfigs/secrets.yaml");
      const fileConfigs = readConfigsFromYamlFiles(appConfigsDirectory);
      configs = {
        ...configs,
        AWS_ACCESS_KEY_ID: fileConfigs[AWS_ACCESS_KEY_ID_ATTR],
        AWS_SECRET_ACCESS_KEY: fileConfigs[AWS_SECRET_ACCESS_KEY_ATTR],
      };
    }

    process.env = {
      ...process.env,
      NODE_ENV: "e2e_test",
      AWS_ACCESS_KEY_ID: configs.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: configs.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: "us-east-1",
      AWS_DEFAULT_REGION: "us-east-1",
    };

    app = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          assetsBucketName: configs.ASSETS_BUCKET_NAME,
          generatedDataBucketName: configs.GENERATED_DATA_BUCKET_NAME,
          invoicesFolderBucketPath: configs.INVOICES_FOLDER_BUCKET_PATH,
          templatesFolderBucketPath: configs.TEMPLATES_FOLDER_BUCKET_PATH,
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [TemplateService],
    }).compile();

    handlebarService = app.get<TemplateService>(TemplateService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("getHandlebarLanguageTemplates", () => {
    it("Should return language templates", async () => {
      const template = await handlebarService.getHandlebarLanguageTemplate("template_en.hbs");
    });
  });
});
