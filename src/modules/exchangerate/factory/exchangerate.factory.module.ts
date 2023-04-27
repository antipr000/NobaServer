import { Module } from "@nestjs/common";
import { CommonModule } from "../../../modules/common/common.module";
import { ExchangeRateClientFactory } from "./exchangerate.factory";
import { StubExchangeRateClient } from "../clients/stub.exchangerate.client";
import { ExchangeRateIOExchangeRateClient } from "../clients/exchangerateio.exchangerate.client";

@Module({
  imports: [CommonModule],
  providers: [ExchangeRateClientFactory, StubExchangeRateClient, ExchangeRateIOExchangeRateClient],
  exports: [ExchangeRateClientFactory],
})
export class ExchangeRateFactoryModule {}
