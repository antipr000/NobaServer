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
export class HandlebarService {
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
        const getObjectResult = await s3.send(getObjectCommand);
        const stringifiedResult = await getObjectResult.Body.transformToString();
        resolve(stringifiedResult);
      } catch (e) {
        reject(e);
      }
    });
  }

  private async pushHTMLToS3(folderPath: string, objectName: string, content: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const s3 = new S3({});
      const options = {
        Bucket: this.configService.get(GENERATED_DATA_BUCKET_NAME),
        Key: this.configService.get(INVOICES_FOLDER_BUCKET_PATH) + folderPath + objectName,
      };

      console.log(options);

      try {
        const putObjectCommand = new PutObjectCommand(options);
        const putObjectResult = await s3.send(putObjectCommand);
        resolve(putObjectResult);
      } catch (e) {
        console.log(e);
        reject(e);
      }
    });
  }

  public async getHandlebarLanguageTemplates(): Promise<Record<string, string>> {
    const [handlebarEnglishTemplate, handlebarSpanishTemplate] = await Promise.all([
      this.loadTemplatesFromS3("/payroll-invoice/", "template_en.hbs"),
      this.loadTemplatesFromS3("/payroll-invoice/", "template_es.hbs"),
    ]);

    return { en: handlebarEnglishTemplate, es: handlebarSpanishTemplate };
  }

  public async pushHandlebarLanguageHTML(employerID: string, filename: string, content: string): Promise<void> {
    await this.pushHTMLToS3(`/${employerID}/`, filename, content);
  }
}
