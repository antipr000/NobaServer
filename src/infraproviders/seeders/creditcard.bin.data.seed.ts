import { Injectable } from "@nestjs/common";
import { DB_DUMP_FILES_BUCKET_PATH, ASSETS_BUCKET_NAME } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { DBProvider } from "../DBProvider";
import { S3 } from "aws-sdk";
import { tmpdir } from "os";
import { createWriteStream, existsSync, mkdir, readFileSync } from "fs";
import { CreditCardBinData } from "../../modules/common/domain/CreditCardBinData";

// TODO(#633): Change to seeding from dump once prod database has BIN data
@Injectable()
export class CreditCardBinDataSeeder {
  private readonly dbDumpBucketPath: string;
  private readonly s3BucketName: string;
  private readonly destinationFilePath: string;
  constructor(private readonly dbProvider: DBProvider, configService: CustomConfigService) {
    this.dbDumpBucketPath = configService.get(DB_DUMP_FILES_BUCKET_PATH);
    this.s3BucketName = configService.get(ASSETS_BUCKET_NAME);
    this.destinationFilePath = tmpdir + "/dump";
  }

  private async downloadDumpFileFromS3(bucketPath: string, fileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const s3 = new S3();
      const options = {
        Bucket: this.s3BucketName,
        Key: `${bucketPath}/${fileName}`,
      };
      if (!existsSync(this.destinationFilePath)) {
        mkdir(this.destinationFilePath, err => {
          if (err) {
            reject(err);
          }
        });
      }
      const file = createWriteStream(`${this.destinationFilePath}/${fileName}`);

      console.log(
        `Downloading file from S3 bucket: ${JSON.stringify(options)} to ${this.destinationFilePath}/${fileName}`,
      );

      const readStream = s3.getObject(options).createReadStream();
      readStream
        .on("end", () => {
          return resolve();
        })
        .on("error", err => reject(err))
        .pipe(file);
    });
  }

  toDomain(data: any): CreditCardBinData {
    return CreditCardBinData.createCreditCardBinDataObject({
      issuer: data.issuer,
      bin: data.bin,
      type: data.type,
      network: data.network,
      mask: data.mask,
      supported: data.supported,
      digits: data.digits,
      cvvDigits: data.cvvDigits,
    });
  }

  async seed() {
    const creditCardBinDataModel = await this.dbProvider.getCreditCardBinDataModel();

    const result = await creditCardBinDataModel.findOne().exec();
    if (result === null) {
      console.log("Started seeding credit card bin data");
      // dbUri is of form uri/dbName
      const fileName = "creditcardbindata.json";

      await this.downloadDumpFileFromS3(this.dbDumpBucketPath, fileName);

      console.log("Completed downloading file from s3");

      const allRecords = JSON.parse(readFileSync(`${this.destinationFilePath}/${fileName}`).toString());

      const recordsToInsert = allRecords.map(record => this.toDomain(record).props);

      await creditCardBinDataModel.insertMany(recordsToInsert, { ordered: false });
      console.log("Completed seeding credit card bin data");
    } else {
      console.log("Credit card bin data already seeded");
    }
  }
}
