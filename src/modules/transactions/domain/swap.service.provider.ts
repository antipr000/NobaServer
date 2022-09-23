import { RouteResponse } from "./SwapServiceProviderTypes";

export interface SwapServiceProvider {
  getIntermediaryLeg(): string;
  performRouting(finalCryptoAsset: string, sourceAmount: number, targetWalletAddress?: string): Promise<RouteResponse>;
}
