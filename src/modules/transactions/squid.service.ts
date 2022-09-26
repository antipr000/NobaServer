import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { RouteResponse } from "./domain/SwapServiceProviderTypes";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { SQUID_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { SquidConfigs } from "src/config/configtypes/SquidConfigs";
import { Squid, Config, GetRoute, Route, TokenData, ChainsData, ChainData } from "@0xsquid/sdk";
import { SwapServiceProvider } from "./domain/swap.service.provider";
const web3 = require("web3");

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

    // TODO(#) this is temporary until we can change the config to have both the ZH & Squid symbol
    let intermediaryLeg = this.intermediaryLeg;
    if (intermediaryLeg === "AVAX") intermediaryLeg = "AVAX.Avalanche";
    if (intermediaryLeg === "DAI.ETH") intermediaryLeg = "DAI.Ethereum";
    const sourceTokenData = this.getTokenData(intermediaryLeg);
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

    this.logger.debug(`Squid route params: ${JSON.stringify(squidParams, null, 1)}`);

    const squidRouteResponse = await this.getRoute(squidParams);
    this.logger.debug(`Squid route response: ${JSON.stringify(squidRouteResponse, null, 1)}`);
    return {
      assetQuantity: this.convertSquidAmountToCryptoAmount(squidRouteResponse.estimate.sendAmount), // TODO(#594): Figure out actual quantity here
      smartContractData: squidRouteResponse.transactionRequest.data,
      exchangeRate: Number(squidRouteResponse.estimate.exchangeRate),
    };
  }

  private getDefaultCrossChainToken(chainId: string | number): string {
    const chains: ChainsData = this.squid.chains;
    console.log(`Getting chain data for chainID: ${chainId}`);
    const chainData: ChainData = chains.filter(chainInfo => chainInfo.chainId.toString() === chainId.toString())[0];
    return chainData.squidContracts.defaultCrosschainToken;
  }

  private getTokenData(tickerAndChainIn: string): TokenData {
    // Ticket must be of the format Chain.Ticker
    if (tickerAndChainIn.indexOf(".") == -1)
      throw new BadRequestException(`Malformed ticker symbol: ${tickerAndChainIn}`);
    const tickerAndChainArr = tickerAndChainIn.split(".");
    if (tickerAndChainArr.length != 2) throw new BadRequestException(`Malformed ticker symbol: ${tickerAndChainIn}`);
    const ticker = tickerAndChainArr[0];
    const chainName = tickerAndChainArr[1];

    const filteredChainData = this.squid.chains.filter(
      chain => chain.chainName.toLowerCase() === chainName.toLowerCase(),
    );
    if (filteredChainData.length === 0) throw new BadRequestException(`Chain ${chainName} not supported`);

    const chainID = filteredChainData[0].chainId;
    const filteredTokenData = this.squid.tokens.filter(
      token => token.symbol.toLowerCase() === ticker.toLowerCase() && token.chainId === chainID,
    );
    if (filteredTokenData.length === 0)
      throw new BadRequestException(`Ticker ${ticker} not supported on chain ${chainName}`);

    console.log(`Got token data: ${JSON.stringify(filteredTokenData[0])}`);
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

  private convertCryptoAmountToSquidAmount(amount: number): string {
    return web3.utils.toWei(amount.toString(), "ether");
  }

  private convertSquidAmountToCryptoAmount(amount: string): number {
    return web3.utils.fromWei(amount, "ether");
  }
}
