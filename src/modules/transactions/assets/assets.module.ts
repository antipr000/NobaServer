import { Module } from "@nestjs/common";
import { CurrencyService } from "../../../modules/common/currency.service";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { CommonModule } from "../../../modules/common/common.module";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { ZeroHashService } from "../zerohash.service";
import { AssetServiceFactory } from "./asset.service.factory";
import { DefaultAssetService } from "./default.asset.service";

@Module({
  imports: [CommonModule, ConsumerModule, getWinstonModule()],
  controllers: [],
  providers: [
    CurrencyService,
    ZeroHashService,
    DefaultAssetService,
    // USDCPolygonAssetService,
    AssetServiceFactory,
  ],
  exports: [AssetServiceFactory, DefaultAssetService /*USDCPolygonAssetService*/],
})
export class AssetsModule {}
