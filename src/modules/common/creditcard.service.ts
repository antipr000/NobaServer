import { Injectable } from "@nestjs/common";
import { parse } from "csv";
import { createReadStream } from "fs";
import * as path from "path";
import { CCBIN_DATA_FILE_PATH } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { unsupportedIssuers, CreditCardDTO, BINValidity, CardType, BINReportDetails } from "./dto/CreditCardDTO";

@Injectable()
export class CreditCardService {
  private ccBINS: Array<CreditCardDTO>;
  private isCCBINSLoaded: boolean;

  constructor(private readonly configService: CustomConfigService) {
    this.isCCBINSLoaded = false;
    this.ccBINS = [];
  }

  private async loadCreditCardBINFile(): Promise<Array<CreditCardDTO>> {
    return new Promise((resolve, reject) => {
      const results = new Array<CreditCardDTO>();
      const parser = parse({ delimiter: ",", columns: true });

      createReadStream(path.resolve(this.configService.get(CCBIN_DATA_FILE_PATH)))
        .pipe(parser)
        .on("data", data => {
          const issuer = `${data["Issuer"]}`.trim();
          const iin = `${data["IIN"]}`.trim();
          const type = `${data["Type"]}`.trim();
          const network = `${data["Scheme"]}`;
          const mask = `${data["Format"]}`.trim();
          const cardType = Object.values(CardType).filter(enumType => enumType.toUpperCase() === type.toUpperCase())[0];
          // A card BIN is supported if it's a debit card or not on the unsupportedIssuers list
          const supported = BINValidity.SUPPORTED; /*
            unsupportedIssuers.indexOf(issuer) == -1 || cardType == CardType.DEBIT
              ? BINValidity.SUPPORTED
              : BINValidity.NOT_SUPPORTED;*/
          const digits = mask.replace(/ /g, "").length; // Replace all spaces and count the characters
          const cvvDigits = network === "Amex" ? 4 : 3; // TODO: are there others?

          // Handle ranges
          if (iin.indexOf("-") > 0) {
            const range = iin.match(/(\d*)\s*-\s*(\d*)/);
            const start = Number(range[1]);
            const end = Number(range[2]);

            for (let i = start; i <= end; i++) {
              results.push({
                bin: String(i),
                issuer: issuer,
                supported: supported,
                network: network,
                digits: digits,
                type: cardType,
                cvvDigits: cvvDigits,
              });
            }
          } else {
            results.push({
              bin: iin,
              issuer: issuer,
              supported: supported,
              network: network,
              digits: digits,
              type: cardType,
              cvvDigits: cvvDigits,
            });
          }
        })
        .on("error", err => {
          reject(err);
        })
        .on("end", () => {
          resolve(results);
        });
    });
  }

  private async getAllKnownBINs(): Promise<Array<CreditCardDTO>> {
    if (this.isCCBINSLoaded) return this.ccBINS;

    this.ccBINS = await this.loadCreditCardBINFile();
    this.isCCBINSLoaded = true;
    return this.ccBINS;
  }

  async getBINReport(): Promise<BINReportDetails> {
    const bins = await this.getAllKnownBINs();
    let supported = 0;
    let unsupported = 0;

    bins.forEach(x => (x.supported === BINValidity.SUPPORTED ? supported++ : unsupported++));

    return {
      supported: supported,
      unsupported: unsupported,
    };
  }

  async getBINDetails(requestedBIN: string): Promise<CreditCardDTO> {
    const bins = await this.getAllKnownBINs();

    const foundBINs = bins.filter(bin => requestedBIN.startsWith(bin.bin));
    if (foundBINs.length == 0) {
      return null;
    }
    return foundBINs[0];
  }

  async isBINSupported(checkBIN: string): Promise<BINValidity> {
    const bin = await this.getBINDetails(checkBIN);

    if (bin == null) {
      return BINValidity.UNKNOWN;
    }

    return bin.supported;
  }
}
