import { Inject, Injectable } from "@nestjs/common";
import { AssetService } from "./asset.service";
import { DefaultAssetService } from "./default.asset.service";
import { USDCPolygonAssetService } from "./usdc.polygon.asset.service";

@Injectable()
export class AssetServiceFactory {
  constructor(
    private readonly defaultAssetService: DefaultAssetService, // private readonly usdcPolygonAssetService: USDCPolygonAssetService,
  ) {}

  getAssetService(ticker: string): AssetService {
    // if (ticker === "USDC.POLYGON") {
    //   return this.usdcPolygonAssetService;
    // }
    return this.defaultAssetService;
  }
}
