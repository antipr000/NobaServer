import { Injectable } from "@nestjs/common";
import { stringify } from "csv-stringify";
import * as fs from "fs";
import { tmpdir } from "os";
import { TransactionDTO } from "../transactions/dto/TransactionDTO";

// TODO: Make it generic to scale to all DTOs.
@Injectable()
export class CsvService {
  public static async convertToCsvAndSaveToDisk(content: Array<TransactionDTO>): Promise<string> {
    // Write to an exports subdir within the filesystem's temporary directory
    const filePath = tmpdir + "/exports/";
    const fileName = filePath + Date.now().toString() + (Math.random() * 1000).toFixed(0).toString() + ".csv";

    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        fs.mkdir(filePath, err => {
          if (err) {
            reject(err);
          }
        });
      }

      stringify(content, { header: true, cast: { date: value => value.toUTCString() } }, (err, output) => {
        if (err) {
          reject(err);
        }
        fs.writeFile(fileName, output, err => {
          if (err) {
            reject(err);
          }
          resolve(fileName);
        });
      });
    });
  }
}
