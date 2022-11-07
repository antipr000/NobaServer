import { Injectable } from "@nestjs/common";
import { CurrencyService } from "../../../modules/common/currency.service";
import { AssetService } from "./asset.service";
import { SwapAssetService } from "./swap.asset.service";
import { USDCPolygonAssetService } from "./usdc.polygon.asset.service";
import { ZerohashAssetService } from "./zerohash.asset.service";
import { SquidService } from "../squid.service";
import { WalletService } from "./wallet.service";

@Injectable()
// TODO(#594): Rename to something proper
export class CommonAssetServiceFactory {
  constructor(
    private readonly zerohashAssetService: ZerohashAssetService,
    private readonly usdcPolygonAssetService: USDCPolygonAssetService,
  ) {}

  getAssetService(ticker: string): AssetService {
    if (ticker.toLocaleLowerCase() === "usdc.polygon") {
      return this.usdcPolygonAssetService;
    }

    return this.zerohashAssetService;
  }

  getWalletService(): WalletService {
    return this.zerohashAssetService;
  }
}

@Injectable()
export class AssetServiceFactory {
  constructor(
    private readonly commonAssetServiceFactory: CommonAssetServiceFactory,
    private readonly currencyService: CurrencyService,
    private readonly squidService: SquidService,
  ) {}

  async getAssetService(ticker: string): Promise<AssetService> {
    const currency = await this.currencyService.getCryptocurrency(ticker);
    if (!currency) throw Error(`Unknown cryptocurrency: ${ticker}`);
    if (currency.provider.toLocaleLowerCase() === "squid") {
      const intermediaryLeg = this.squidService.getIntermediaryLeg();
      const assetService: AssetService = this.commonAssetServiceFactory.getAssetService(intermediaryLeg);

      return new SwapAssetService(this.squidService, assetService);
    } else {
      return this.commonAssetServiceFactory.getAssetService(ticker);
    }
  }

  getWalletService(): WalletService {
    return this.commonAssetServiceFactory.getWalletService();
  }
}
