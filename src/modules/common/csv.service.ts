import { Injectable } from "@nestjs/common";
import { stringify } from 'csv-stringify';
import * as fs from 'fs';
import { TransactionDTO } from "../transactions/dto/TransactionDTO";

// TODO: Make it generic to scale to all DTOs. 
@Injectable()
export class CsvService {
    public static async convertToCsvAndSaveToDisk(content: Array<TransactionDTO>): Promise<string> {
        const filePath = "/tmp/"
            + Date.now().toString()
            + (Math.random() * 1000).toFixed(0).toString()
            + ".csv";

        return new Promise((resolve, reject) => {
            stringify(content,
                { header: true, cast: { date: (value) => value.toUTCString() } },
                (err, output) => {
                    if (err) {
                        reject(err);
                    }
                    fs.writeFile(filePath, output, err => {
                        if (err) {
                            reject(err);
                        }
                        resolve(filePath);
                    });
                });
        });
    }
}