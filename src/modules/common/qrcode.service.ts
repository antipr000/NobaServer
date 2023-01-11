import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import QRCode from "qrcode";

@Injectable()
export class QRService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  async generateQRCode(encodedText: string): Promise<string> {
    const logger = this.logger;

    return new Promise((resolve, reject) => {
      QRCode.toDataURL(
        encodedText,
        { type: "image/png", color: { dark: "004252" }, width: 1000 },
        (err, base64OfImage) => {
          if (err) {
            logger.error(JSON.stringify(err));
            reject(err);
          }
          resolve(base64OfImage);
        },
      );
    });
  }
}
