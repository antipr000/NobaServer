import { Inject, Injectable } from "@nestjs/common";
import { CreditCardBinDataSeeder } from "./creditcard.bin.data.seed";

@Injectable()
export class SeederService {
  @Inject(CreditCardBinDataSeeder) creditCardBinDataSeeder: CreditCardBinDataSeeder;

  public async seedData() {
    await this.creditCardBinDataSeeder.seed();
  }
}
