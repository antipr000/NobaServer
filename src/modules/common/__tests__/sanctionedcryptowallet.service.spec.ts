import { Test, TestingModule } from "@nestjs/testing";
import { join } from "path";
import { AWS_ACCESS_KEY_ID_ATTR, AWS_SECRET_ACCESS_KEY_ATTR } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { readConfigsFromYamlFiles } from "../../../core/utils/YamlJsonUtils";
import { SanctionedCryptoWalletService } from "../sanctionedcryptowallet.service";

describe("SanctionedCryptoWalletService", () => {
  let sanctionedCryptoWalletService: SanctionedCryptoWalletService;
  let app: TestingModule;

  jest.setTimeout(30000);

  beforeAll(async () => {
    let configs = {
      ASSETS_BUCKET_NAME: "prod-noba-assets",
      SANCTIONED_CRYPTO_WALLETS_FILE_BUCKET_PATH: "assets/data/sanctioned_wallets.csv",
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
          sanctionedCryptoWalletsFileBucketPath: configs.SANCTIONED_CRYPTO_WALLETS_FILE_BUCKET_PATH,
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [SanctionedCryptoWalletService],
    }).compile();

    sanctionedCryptoWalletService = app.get<SanctionedCryptoWalletService>(SanctionedCryptoWalletService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("isSanctionedWallet", () => {
    it("Should return false for a wallet that is not sanctioned", async () => {
      const isWalletSanctioned = await sanctionedCryptoWalletService.isWalletSanctioned("12345");

      expect(isWalletSanctioned).toBeFalsy();
    });

    it("Should return true for a wallet that is sanctioned", async () => {
      const isWalletSanctioned = await sanctionedCryptoWalletService.isWalletSanctioned(
        "3QJyT8nThEQakbfqgX86YjCK1Sp9hfNCUW",
      );

      expect(isWalletSanctioned).toBeTruthy();
    });
  });
});
