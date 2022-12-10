import { Injectable } from "@nestjs/common";
import { CurrencyService } from "../../../modules/common/currency.service";
import { AssetService } from "./asset.service";
import { USDCPolygonAssetService } from "./usdc.polygon.asset.service";
import { ZerohashAssetService } from "./zerohash.asset.service";
import { WalletProviderService } from "./wallet.provider.service";

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

  getWalletProviderService(): WalletProviderService {
    return this.zerohashAssetService;
  }
}

@Injectable()
export class AssetServiceFactory {
  constructor(
    private readonly commonAssetServiceFactory: CommonAssetServiceFactory,
    private readonly currencyService: CurrencyService,
  ) {}

  async getAssetService(ticker: string): Promise<AssetService> {
    const currency = await this.currencyService.getCryptocurrency(ticker);
    if (!currency) throw Error(`Unknown cryptocurrency: ${ticker}`);
    return this.commonAssetServiceFactory.getAssetService(ticker);
  }

  getWalletProviderService(): WalletProviderService {
    return this.commonAssetServiceFactory.getWalletProviderService();
  }
}
