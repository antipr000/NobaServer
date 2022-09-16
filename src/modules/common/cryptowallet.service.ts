import { Injectable } from "@nestjs/common";
import { S3 } from "aws-sdk";
import { parse } from "csv";
import { ASSETS_BUCKET_NAME, SANCTIONED_CRYPTO_WALLETS_FILE_BUCKET_PATH } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

@Injectable()
export class CryptoWalletService {
  private cryptoWallets: string[];
  private isCryptoWalletLoaded: boolean;

  constructor(private readonly configService: CustomConfigService) {
    this.isCryptoWalletLoaded = false;
    this.cryptoWallets = [];
  }

  private async loadCryptoWalletsFromS3(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const results = new Array<string>();
      const parser = parse({ delimiter: ",", columns: true });
      const s3 = new S3();
      const options = {
        Bucket: this.configService.get(ASSETS_BUCKET_NAME),
        Key: this.configService.get(SANCTIONED_CRYPTO_WALLETS_FILE_BUCKET_PATH),
      };

      const readStream = s3.getObject(options).createReadStream();
      readStream
        .pipe(parser)
        .on("data", data => {
          const walletAddress = `${data["Address"]}`.trim();
          results.push(walletAddress);
        })
        .on("error", err => {
          reject(err);
        })
        .on("end", () => {
          resolve(results);
        });
    });
  }

  private async getSanctionedWalletAddresses(): Promise<string[]> {
    if (this.isCryptoWalletLoaded) return this.cryptoWallets;

    this.cryptoWallets = await this.loadCryptoWalletsFromS3();
    this.isCryptoWalletLoaded = true;

    return this.cryptoWallets;
  }

  async isWalletSanctioned(walletAddress: string): Promise<boolean> {
    const sannctionedWalletAddresses = await this.getSanctionedWalletAddresses();
    if (sannctionedWalletAddresses.includes(walletAddress)) {
      return true;
    } else {
      return false;
    }
  }
}
