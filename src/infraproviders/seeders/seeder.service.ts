import { Inject, Injectable } from "@nestjs/common";
import { AdminSeeder } from "./admin.seed";
import { CreditCardBinDataSeeder } from "./creditcard.bin.data.seed";
import { NobaPartnerSeed } from "./noba.partner.seed";

@Injectable()
export class SeederService {
  @Inject(CreditCardBinDataSeeder) creditCardBinDataSeeder: CreditCardBinDataSeeder;
  @Inject(AdminSeeder) adminSeeder: AdminSeeder;
  @Inject(NobaPartnerSeed) nobaPartnerSeed: NobaPartnerSeed;

  public async seedData() {
    await this.creditCardBinDataSeeder.seed();
    await this.adminSeeder.seed();
    await this.nobaPartnerSeed.seed();
  }
}
