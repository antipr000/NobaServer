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
    const s3 = new S3({});
    const options = {
      Bucket: this.assetsBucketName,
      Key: folderPath + objectName,
    };

    const getObjectCommand = new GetObjectCommand(options);

    return s3
      .send(getObjectCommand)
      .then(getObjectResult => {
        return getObjectResult.Body.transformToString();
      })
      .catch(e => {
        this.logger.error(`Failed to load file from S3: ${e.message}`);
        throw e;
      });
  }

  async uploadToS3(
    folderPath: string,
    objectName: string,
    content: string | Buffer,
    contentEncoding?: string,
    contentType?: string,
  ): Promise<any> {
    // Ensure separation between folder path and filename
    if (!folderPath.endsWith("/") && !objectName.startsWith("/")) {
      folderPath += "/";
    }

    const s3 = new S3({});
    const options = {
      Bucket: this.generatedDataBucketName,
      Key: folderPath + objectName,
      Body: content,
      ...(contentEncoding && { ContentEncoding: contentEncoding }),
      ...(contentType && { ContentType: contentType }),
    };

    const putObjectCommand = new PutObjectCommand(options);

    return s3
      .send(putObjectCommand)
      .then(putObjectResult => {
        return putObjectResult;
      })
      .catch(e => {
        this.logger.error(`Failed to upload file to S3: ${e.message}`);
        throw e;
      });
  }
}
