import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { Logger } from "winston";
import { AppService } from "../../../app.service";
import { FundsAvailabilityRequest, ConsumerAccountTransferRequest, ConsumerWalletTransferRequest, FundsAvailabilityStatus, PollStatus, FundsAvailabilityResponse } from "../domain/AssetTypes";
import { TransactionQuoteQueryDTO } from "../dto/TransactionQuoteQuery.DTO";
import { ZeroHashService } from "../zerohash.service";
import { AssetService } from "./asset.service";
import { CurrencyType } from "../../common/domain/Types";
import { ExecutedQuote, ZerohashTradeResponse, ZerohashTradeRquest, ZerohashTransfer, ZerohashTransferStatus } from "../domain/ZerohashTypes";

@Injectable()
export class DefaultAssetService implements AssetService {
  constructor(
    private readonly appService: AppService,
    private readonly zerohashService: ZeroHashService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
  }

  getQuote(quoteQuery: TransactionQuoteQueryDTO) {
    throw new Error("Method not implemented.");
  }

  /**
   * Make the requested fund available for transfer to consumer wallet.
   * 
   * @param request: Fiat and Crypto Asset details to be exchanged.
   * @returns 
   *   - If succeed, returns the ID which can be polled for completion using `pollFundsAvailableStatus` function.
   *   - If failed, throws the error.
   * 
   * TODO(#): Make it idempotent by using 'transactionId'.
   * TODO(#): Fails gracefully with proper error messages.
   */
  async makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse> {
    const supportedCryptocurrencies = await this.appService.getSupportedCryptocurrencies();
    if (supportedCryptocurrencies.filter(curr => curr.ticker === request.cryptoCurrency).length == 0) {
      throw new BadRequestError({
        messageForClient: `Unsupported cryptocurrency: ${request.cryptoCurrency}`,
      });
    }

    const supportedFiatCurrencies = await this.appService.getSupportedFiatCurrencies();
    if (supportedFiatCurrencies.filter(curr => curr.ticker === request.fiatCurrency).length == 0) {
      throw new Error(`${request.fiatCurrency} is not supported by ZHLS`);
    }

    // Snce we've already calculated fees & spread based on a true fixed side, we will always pass FIAT here
    const executedQuote: ExecutedQuote =
      await this.zerohashService.requestAndExecuteQuote(request.cryptoCurrency, request.fiatCurrency, request.fiatAmount, CurrencyType.FIAT);

    // TODO(#) Check slippage.

    const assetTransferId: string =
      await this.zerohashService.transferAssetsToNoba(request.cryptoCurrency, executedQuote.cryptoReceived);

    this.logger.debug(`AssetTransferId: ${assetTransferId}`);
    return {
      id: assetTransferId,
      tradePrice: executedQuote.tradePrice,
    };
  }

  /**
   * Polls the status for the funds available requests sent using `makeFundsAvailable()`.
   * This function is stateless and idempotent. Hence, can be called parallelly for same ID.
   * 
   * @param id: ID returned from the `makeFundsAvailable()` function.
   * @returns 
   *   - If status = SUCCESS, returns unique ID for the specific account update in 'settledId'
   *   - If status = PENDING, all other fields will be null.
   *   - If status = FAILURE, the transfer request failed because of an expected reason & can be retried.
   *   - If status = FATAL_ERROR, unexpected error, 'errorMessage' contains the reason.
   */
  async pollFundsAvailableStatus(id: string): Promise<FundsAvailabilityStatus> {
    try {
      const zhTransfer: ZerohashTransfer = await this.zerohashService.getTransfer(id);

      switch (zhTransfer.status) {
        case ZerohashTransferStatus.APPROVED:
          return {
            status: PollStatus.PENDING,
            errorMessage: null,
            settledId: null,
          };

        case ZerohashTransferStatus.PENDING:
          return {
            status: PollStatus.PENDING,
            errorMessage: null,
            settledId: null,
          };

        case ZerohashTransferStatus.SETTLED:
          return {
            status: PollStatus.SUCCESS,
            errorMessage: null,
            settledId: zhTransfer.movementId,
          };

        case ZerohashTransferStatus.REJECTED:
          return {
            status: PollStatus.FATAL_ERROR,
            errorMessage: `Liquidity transfer to Noba was rejected for transferId '${id}'`,
            settledId: null,
          };

        case ZerohashTransferStatus.CANCELLED:
          return {
            status: PollStatus.FAILURE,
            errorMessage: `Liquidity transfer to Noba was cancelled for transferId '${id}'`,
            settledId: null,
          }

        default:
          throw Error(`Unexpected Zerohash Transfer status: ${zhTransfer.status}`);
      }
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return {
        status: PollStatus.FATAL_ERROR,
        errorMessage: `Liquidity transfer failed for '${id}': ${err.message}`,
        settledId: null,
      }
    }
  }

  async transferAssetToConsumerAccount(request: ConsumerAccountTransferRequest): Promise<string> {
    // Gets or creates participant code
    const consumerParticipantCode: string =
      await this.zerohashService.getParticipantCode(request.consumer, request.transactionCreationTimestamp);

    // TODO(#310) Confirm that the traded values comes out correctly
    const tradeRequest: ZerohashTradeRquest = {
      broughtAssetId: request.cryptoCurrency,
      soldAssetId: request.fiatCurrency,

      tradeAmount: request.totalCryptoAmount,
      tradePrice: request.cryptoAssetTradePrice,

      buyerParticipantCode: consumerParticipantCode,
      sellerParticipantCode: this.zerohashService.getNobaPlatformCode(),

      idempotencyId: request.transactionId,
      requestorEmail: request.consumer.email,
    };
    const tradeResponse: ZerohashTradeResponse =
      await this.zerohashService.executeTrade(tradeRequest);

    return tradeResponse.tradeId;
  }

  pollAssetTransferToConsumerStatus(id: string) {
    throw new Error("Method not implemented.");
  }

  transferToConsumerWallet(request: ConsumerWalletTransferRequest) {
    throw new Error("Method not implemented.");
  }

  pollConsumerWalletTransferStatus(id: string) {
    throw new Error("Method not implemented.");
  }
};