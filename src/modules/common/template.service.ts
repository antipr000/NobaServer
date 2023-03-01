import { Inject, Injectable } from "@nestjs/common";
import { S3, GetObjectCommand } from "@aws-sdk/client-s3";
import { parse } from "csv";
import { ASSETS_BUCKET_NAME, TEMPLATES_FOLDER_BUCKET_PATH } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Readable } from "stream";

@Injectable()
export class TemplateService {
  @Inject()
  private readonly configService: CustomConfigService;

  private async loadTemplatesFromS3(): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      const results = new Array<string>();
      const parser = parse({ delimiter: ",", columns: true });
      const s3 = new S3({});
      const options = {
        Bucket: this.configService.get(ASSETS_BUCKET_NAME),
        Key: this.configService.get(TEMPLATES_FOLDER_BUCKET_PATH),
      };

      const getObjectCommand = new GetObjectCommand(options);

      const getObjectResult = await s3.send(getObjectCommand);

      const stringifiedResult = await getObjectResult.Body.transformToString();

      const readStream = new Readable();
      readStream.push(stringifiedResult);
      readStream.push(null);
      readStream
        .pipe(parser)
        .on("data", data => {
          console.log(data);
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

  public async getHandleBarTemplates(): Promise<Record<string, string>> {
    const handleBarTemplates = await this.loadTemplatesFromS3();

    return { EN: "<html></html>", ES: "<html></html>" };
  }
}
