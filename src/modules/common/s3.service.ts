import { Inject, Injectable } from "@nestjs/common";
import { S3, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { ASSETS_BUCKET_NAME, GENERATED_DATA_BUCKET_NAME } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class S3Service {
  private readonly assetsBucketName: string;
  private readonly generatedDataBucketName: string;

  constructor(
    private readonly configService: CustomConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.assetsBucketName = this.configService.get(ASSETS_BUCKET_NAME);
    this.generatedDataBucketName = this.configService.get(GENERATED_DATA_BUCKET_NAME);
  }

  async loadFromS3(folderPath: string, objectName: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const s3 = new S3({});
      const options = {
        Bucket: this.assetsBucketName,
        Key: folderPath + objectName,
      };

      try {
        const getObjectCommand = new GetObjectCommand(options);
        const getObjectResult = await s3.send(getObjectCommand);
        const stringifiedResult = await getObjectResult.Body.transformToString();
        resolve(stringifiedResult);
      } catch (e) {
        this.logger.error(`Failed to load file from S3: ${e.message}`);
        reject(e);
      }
    });
  }

  async uploadToS3(folderPath: string, objectName: string, content: string | Buffer): Promise<any> {
    // Ensure speparation between folder path and filename
    if (!folderPath.endsWith("/") && !objectName.startsWith("/")) {
      folderPath += "/";
    }

    return new Promise(async (resolve, reject) => {
      const s3 = new S3({});
      const options = {
        Bucket: this.generatedDataBucketName,
        Key: folderPath + objectName,
        Body: content,
      };

      try {
        const putObjectCommand = new PutObjectCommand(options);
        const putObjectResult = await s3.send(putObjectCommand);
        resolve(putObjectResult);
      } catch (e) {
        this.logger.error(`Failed to upload file to S3: ${e.message}`);
        reject(e);
      }
    });
  }
}
