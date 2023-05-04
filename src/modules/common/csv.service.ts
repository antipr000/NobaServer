import { Injectable } from "@nestjs/common";
import { stringify } from "csv-stringify";
import fs from "fs";
import { tmpdir } from "os";
import { TransactionDTO } from "../transaction/dto/TransactionDTO";
import { Readable } from "stream";
import { parse } from "csv";

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
        fs.writeFile(fileName, output, err2 => {
          if (err2) {
            reject(err2);
          }
          resolve(fileName);
        });
      });
    });
  }

  public async getHeadersFromCsvFile(buffer: Buffer): Promise<Array<string>> {
    const parser = parse({ delimiter: "," });
    return new Promise((resolve, reject) => {
      const readStream = new Readable();
      readStream.push(buffer);
      readStream.push(null);
      readStream
        .pipe(parser)
        .on("data", (headers: Array<string>) => {
          resolve(headers); // The first line is headers so we resolve directly
        })
        .on("error", err => reject(err));
    });
  }
}
