import { Inject, Injectable } from "@nestjs/common";
import { S3, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { parse } from "csv";
import { ASSETS_BUCKET_NAME, TEMPLATES_FOLDER_BUCKET_PATH } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Readable } from "stream";

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
        const getObjectResult = await s3.send(getObjectCommand);
        const stringifiedResult = await getObjectResult.Body.transformToString();
        resolve(stringifiedResult);
      } catch (e) {
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
}
