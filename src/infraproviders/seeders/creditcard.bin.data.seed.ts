import { Injectable } from "@nestjs/common";
import { CCBIN_DATA_FILE_PATH } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { parse } from "csv";
import { createReadStream } from "fs";
import path from "path";
import { unsupportedIssuers, BINValidity, CardType } from "../../modules/common/dto/CreditCardDTO";
import { DBProvider } from "../DBProvider";
import { CreditCardBinData } from "../../modules/common/domain/CreditCardBinData";

// TODO(#633): Change to seeding from dump once prod database has BIN data
@Injectable()
export class CreditCardBinDataSeeder {
  private readonly binDataFilePath: string;
  constructor(private readonly dbProvider: DBProvider, configService: CustomConfigService) {
    this.binDataFilePath = configService.get(CCBIN_DATA_FILE_PATH);
  }

  private async loadCreditCardBINFile(): Promise<Array<CreditCardBinData>> {
    return new Promise((resolve, reject) => {
      const results = new Array<CreditCardBinData>();
      const parser = parse({ delimiter: ",", columns: true });

      createReadStream(path.resolve(this.binDataFilePath))
        .pipe(parser)
        .on("data", data => {
          const issuer = `${data["Issuer"]}`.trim();
          const iin = `${data["IIN"]}`.trim();
          const type = `${data["Type"]}`.trim();
          const network = `${data["Scheme"]}`;
          const mask = `${data["Format"]}`.trim();
          const cardType = Object.values(CardType).filter(enumType => enumType.toUpperCase() === type.toUpperCase())[0];
          // A card BIN is supported if it's a debit card or not on the unsupportedIssuers list
          const supported =
            unsupportedIssuers.indexOf(issuer) == -1 || cardType == CardType.DEBIT
              ? BINValidity.SUPPORTED
              : BINValidity.NOT_SUPPORTED;
          const digits = mask.replace(/ /g, "").length; // Replace all spaces and count the characters
          const cvvDigits = network === "Amex" ? 4 : 3; // TODO: are there others?

          // Handle ranges
          if (iin.indexOf("-") > 0) {
            const range = iin.match(/(\d*)\s*-\s*(\d*)/);
            const start = Number(range[1]);
            const end = Number(range[2]);

            for (let i = start; i <= end; i++) {
              results.push(
                CreditCardBinData.createCreditCardBinDataObject({
                  bin: String(i),
                  issuer: issuer,
                  supported: supported,
                  network: network,
                  digits: digits,
                  type: cardType,
                  cvvDigits: cvvDigits,
                  mask: mask,
                }),
              );
            }
          } else {
            results.push(
              CreditCardBinData.createCreditCardBinDataObject({
                bin: iin,
                issuer: issuer,
                supported: supported,
                network: network,
                digits: digits,
                type: cardType,
                cvvDigits: cvvDigits,
                mask: mask,
              }),
            );
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

  async seed() {
    console.log("Started seeding credit card bin data");
    const data: Array<CreditCardBinData> = await this.loadCreditCardBINFile();
    console.log(data.length);
    const creditCardBinDataModel = await this.dbProvider.getCreditCardBinDataModel();
    if (data.length === 0) {
      console.log("Nothing to load");
      return;
    }
    const result = await creditCardBinDataModel.findOne({ bin: data[0].props.bin }).exec();
    if (result === null) {
      const dataToAdd = data.map(binData => binData.props);
      await creditCardBinDataModel.insertMany(dataToAdd);
    } else {
      console.log("Credit card bin data already seeded");
    }
    console.log("Completed seeding credit card bin data");
  }
}
