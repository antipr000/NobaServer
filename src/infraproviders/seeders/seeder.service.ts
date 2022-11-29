import { Inject, Injectable } from "@nestjs/common";
import { AdminSeeder } from "./admin.seed";
import { CreditCardBinDataSeeder } from "./creditcard.bin.data.seed";
import { LimitConfigSeeder } from "./limit.config.seed";
import { LimitProfileSeeder } from "./limit.profile.seed";
import { NobaPartnerSeed } from "./noba.partner.seed";

@Injectable()
export class SeederService {
  @Inject(CreditCardBinDataSeeder) creditCardBinDataSeeder: CreditCardBinDataSeeder;
  @Inject(AdminSeeder) adminSeeder: AdminSeeder;
  @Inject(NobaPartnerSeed) nobaPartnerSeed: NobaPartnerSeed;
  @Inject(LimitProfileSeeder) limitProfileSeeder: LimitProfileSeeder;
  @Inject(LimitConfigSeeder) limitConfigSeeder: LimitConfigSeeder;

  public async seedData() {
    await this.creditCardBinDataSeeder.seed();
    await this.adminSeeder.seed();
    await this.nobaPartnerSeed.seed();
    await this.limitProfileSeeder.seed();
    await this.limitConfigSeeder.seed();
  }
}
