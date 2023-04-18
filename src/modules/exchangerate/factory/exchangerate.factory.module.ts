import { Module } from "@nestjs/common";
import { CommonModule } from "../../../modules/common/common.module";
import { ExchangeRateFactory } from "./exchangerate.factory";

@Module({
  imports: [CommonModule],
  providers: [ExchangeRateFactory],
  exports: [ExchangeRateFactory],
})
export class ExchangeRateModule {}
