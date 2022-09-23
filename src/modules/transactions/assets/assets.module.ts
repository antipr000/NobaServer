import { Module } from "@nestjs/common";
import { CurrencyService } from "../../../modules/common/currency.service";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { CommonModule } from "../../../modules/common/common.module";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { ZeroHashService } from "../zerohash.service";
import { AssetServiceFactory, CommonAssetServiceFactory } from "./asset.service.factory";
import { USDCPolygonAssetService } from "./usdc.polygon.asset.service";
import { ZerohashAssetService } from "./zerohash.asset.service";
import { SwapAssetService } from "./swap.asset.service";
import { SquidService } from "../squid.service";

@Module({
  imports: [CommonModule, ConsumerModule, getWinstonModule()],
  controllers: [],
  providers: [
    CurrencyService,
    ZeroHashService,
    USDCPolygonAssetService,
    AssetServiceFactory,
    ZerohashAssetService,
    SwapAssetService,
    SquidService,
    CommonAssetServiceFactory,
  ],
  exports: [
    AssetServiceFactory,
    USDCPolygonAssetService,
    ZerohashAssetService,
    SwapAssetService,
    CommonAssetServiceFactory,
  ],
})
export class AssetsModule {}
