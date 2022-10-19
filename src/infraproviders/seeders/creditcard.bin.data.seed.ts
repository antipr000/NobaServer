import { Injectable } from "@nestjs/common";
import { DB_DUMP_FILES_BUCKET_PATH, MONGO_CONFIG_KEY, ASSETS_BUCKET_NAME } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { DBProvider } from "../DBProvider";
import { exec } from "child_process";
import { MongoConfigs } from "../../config/configtypes/MongoConfigs";
import { S3 } from "aws-sdk";
import { tmpdir } from "os";
import { createWriteStream, existsSync, mkdir } from "fs";

// TODO(#633): Change to seeding from dump once prod database has BIN data
@Injectable()
export class CreditCardBinDataSeeder {
  private readonly dbDumpBucketPath: string;
  private readonly dbUri: string;
  private readonly s3BucketName: string;
  private readonly destinationFilePath: string;
  constructor(private readonly dbProvider: DBProvider, configService: CustomConfigService) {
    this.dbDumpBucketPath = configService.get(DB_DUMP_FILES_BUCKET_PATH);
    this.dbUri = configService.get<MongoConfigs>(MONGO_CONFIG_KEY).uri;
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
        .pipe(file)
        .on("end", () => {
          return resolve();
        })
        .on("error", err => reject(err));
    });
  }

  async seed() {
    console.log("Started seeding credit card bin data");
    const creditCardBinDataModel = await this.dbProvider.getCreditCardBinDataModel();

    const result = await creditCardBinDataModel.findOne().exec();
    if (result === null) {
      // dbUri is of form uri/dbName
      const dbName = this.dbUri.slice(this.dbUri.lastIndexOf("/") + 1);
      const uri = this.dbUri.slice(0, this.dbUri.lastIndexOf("/"));
      const fileName = "creditcardbindata.bson";

      await this.downloadDumpFileFromS3(this.dbDumpBucketPath, fileName);
      console.log("Completed downloading file from s3");
      exec(
        `mongorestore --uri=${uri} --db=${dbName} --collection=creditcardbindata ${this.destinationFilePath}/${fileName}`,
      );
    } else {
      console.log("Credit card bin data already seeded");
    }

    while ((await creditCardBinDataModel.findOne({}).exec()) === null) {
      // Sleep for 2 seconds
      console.log("Credit card bin data not loaded yet");
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log("Completed seeding credit card bin data");
  }
}
