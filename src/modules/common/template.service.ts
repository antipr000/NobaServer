import { Inject, Injectable } from "@nestjs/common";
import { S3, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  ASSETS_BUCKET_NAME,
  TEMPLATES_FOLDER_BUCKET_PATH,
  INVOICES_FOLDER_BUCKET_PATH,
  GENERATED_DATA_BUCKET_NAME,
} from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

@Injectable()
export class TemplateService {
  @Inject()
  private readonly configService: CustomConfigService;

  private async loadTemplatesFromS3(folderPath: string, objectName: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const s3 = new S3({});
      const options = {
        Bucket: this.configService.get(ASSETS_BUCKET_NAME),
        Key: this.configService.get(TEMPLATES_FOLDER_BUCKET_PATH) + folderPath + objectName,
      };

      try {
        const getObjectCommand = new GetObjectCommand(options);
        console.log(getObjectCommand);
        const getObjectResult = await s3.send(getObjectCommand);
        const stringifiedResult = await getObjectResult.Body.transformToString();
        resolve(stringifiedResult);
      } catch (e) {
        console.log("Error loading template from S3: ", e);
        reject(e);
      }
    });
  }

  private async pushFileToS3(folderPath: string, objectName: string, content: string | Buffer): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const s3 = new S3({});
      const options = {
        Bucket: this.configService.get(GENERATED_DATA_BUCKET_NAME),
        Key: this.configService.get(INVOICES_FOLDER_BUCKET_PATH) + folderPath + objectName,
        Body: content,
      };

      try {
        const putObjectCommand = new PutObjectCommand(options);
        const putObjectResult = await s3.send(putObjectCommand);
        resolve(putObjectResult);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async getHandlebarLanguageTemplate(filename: string): Promise<string> {
    return this.loadTemplatesFromS3("/payroll-invoice/", filename);
  }

  public async pushHandlebarLanguageFile(
    employerReferralID: string,
    filename: string,
    content: string | Buffer,
  ): Promise<void> {
    await this.pushFileToS3(`/${employerReferralID}/`, filename, content);
  }
}