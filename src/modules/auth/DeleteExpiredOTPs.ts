import { Inject, Logger } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Cron } from "@nestjs/schedule";
import { IOTPRepo } from "../common/repo/OTPRepo";

export class DeleteExpiredOTPs {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("OTPRepo")
  private readonly otpRepo: IOTPRepo;

  // Run every 4 hours on the hour
  @Cron("0 0 */4 * * *", {
    name: "DeleteExpiredOTPs",
  })
  run() {
    this.logger.debug("Deleting all expired OTPs");
    this.otpRepo.deleteAllExpiredOTPs();
  }
}
