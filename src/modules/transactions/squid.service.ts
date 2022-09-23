import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { RouteResponse } from "./domain/SwapServiceProviderTypes";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { SQUID_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { SquidConfigs } from "src/config/configtypes/SquidConfigs";
import { Squid, Config, GetRoute, Route, TokenData, ChainsData, ChainData } from "@0xsquid/sdk";
import { SwapServiceProvider } from "./domain/swap.service.provider";

@Injectable()
export class SquidService implements SwapServiceProvider {
  private readonly squid: Squid;
  private readonly intermediaryLeg: string;
  private readonly temporaryWalletAddress: string;
  private readonly slippage: number;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger, configService: CustomConfigService) {
    const baseUrl = configService.get<SquidConfigs>(SQUID_CONFIG_KEY).baseUrl;
    const apiKey = configService.get<SquidConfigs>(SQUID_CONFIG_KEY).apiKey;
    this.intermediaryLeg = configService.get<SquidConfigs>(SQUID_CONFIG_KEY).intermediaryLeg;
    this.temporaryWalletAddress = configService.get<SquidConfigs>(SQUID_CONFIG_KEY).temporaryWalletAddress;
    this.slippage = configService.get<SquidConfigs>(SQUID_CONFIG_KEY).slippage;

    const squidConfig: Config = {
      apiKey: apiKey,
      baseUrl: baseUrl,
      executionSettings: {
        infiniteApproval: true,
      },
    };

    this.squid = new Squid(squidConfig);
  }

  getIntermediaryLeg(): string {
    return this.intermediaryLeg;
  }

  async performRouting(
    finalCryptoAsset: string,
    sourceAmount: number,
    targetWalletAddress?: string,
  ): Promise<RouteResponse> {
    await this.initializeSquid();
    if (!targetWalletAddress) targetWalletAddress = this.temporaryWalletAddress;
    const destinationTokenData = this.getTokenData(finalCryptoAsset);
    const sourceTokenData = this.getTokenData(this.intermediaryLeg);
    const crossChainTokenAddress = this.getDefaultCrossChainToken(destinationTokenData.chainId);

    const squidParams: GetRoute = {
      sourceChainId: sourceTokenData.chainId,
      destinationChainId: destinationTokenData.chainId,
      sourceTokenAddress: sourceTokenData.address,
      destinationTokenAddress: crossChainTokenAddress,
      sourceAmount: `${this.convertCryptoAmountToSquidAmount(sourceAmount)}`,
      recipientAddress: targetWalletAddress,
      slippage: this.slippage,
    };

    const squidRouteResponse = await this.getRoute(squidParams);
    return {
      assetQuantity: this.convertSquidAmountToCryptoAmount(squidRouteResponse.estimate.sendAmount), // TODO(#594): Figure out actual quantity here
      smartContractData: squidRouteResponse.transactionRequest.data,
    };
  }

  private getDefaultCrossChainToken(chainId: string | number): string {
    const chains: ChainsData = this.squid.chains;
    const chainData: ChainData = chains.filter(chainInfo => chainInfo.chainId.toString() === chainId)[0];
    return chainData.squidContracts.defaultCrosschainToken;
  }

  private getTokenData(ticker: string): TokenData {
    const filteredTokenData = this.squid.tokens.filter(token => token.symbol.toLowerCase() === ticker.toLowerCase());
    if (filteredTokenData.length === 0) throw new BadRequestException(`Ticker ${ticker} not supported`);
    return filteredTokenData[0];
  }

  private async getRoute(params: GetRoute): Promise<Route> {
    try {
      const { route } = await this.squid.getRoute(params);
      return route;
    } catch (e) {
      this.logger.error(`Squid getRoute API failed. Reason: ${JSON.stringify(e)}`);
      throw new BadRequestException("Failed to execute transaction");
    }
  }

  private async initializeSquid(): Promise<void> {
    if (!this.squid.initialized) {
      await this.squid.init();
    }
  }

  //TODO(#594): Use different external service for these calculations
  private convertCryptoAmountToSquidAmount(amount: number): string {
    const strAmount = `${amount}`;
    const [nonDecimalPart, decimalPart] = strAmount.split(".");
    const decimalPartInWei = Math.round(parseInt(decimalPart) * 1000000 * 1000000 * 1000000); // will be less than 10^18
    return `${nonDecimalPart}${decimalPartInWei}`;
  }

  private convertSquidAmountToCryptoAmount(amount: string): number {
    const decimalPart = amount.substring(amount.length - 18);
    const integerPart = amount.substring(0, amount.length - 18);
    return parseFloat(`${integerPart}.${decimalPart}`);
  }
}
