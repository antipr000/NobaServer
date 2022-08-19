import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { Logger } from "winston";
import { AppService } from "../../../app.service";
import { FundsAvailabilityRequest, ConsumerAccountTransferRequest, ConsumerWalletTransferRequest } from "../domain/AssetTypes";
import { TransactionQuoteQueryDTO } from "../dto/TransactionQuoteQuery.DTO";
import { ZeroHashService } from "../zerohash.service";
import { AssetService } from "./asset.service";

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

  async makeFundsAvailable(request: FundsAvailabilityRequest) {
    let returnStatus = CryptoTransactionRequestResultStatus.FAILED;

    const fiatCurrency: string = request.fiatCurrency;
    const cryptocurrency: string = request.cryptoCurrency;
    const amount = transaction.props.leg1Amount;

    const supportedCryptocurrencies = await this.appService.getSupportedCryptocurrencies();
    if (supportedCryptocurrencies.filter(curr => curr.ticker === request.cryptoCurrency).length == 0) {
      throw new BadRequestError({
        messageForClient: `Unsupported cryptocurrency: ${cryptocurrency}`,
      });
    }

    const supportedFiatCurrencies = await this.appService.getSupportedFiatCurrencies();
    if (supportedFiatCurrencies.filter(curr => curr.ticker === request.fiatCurrency).length == 0) {
      throw new Error(`${fiatCurrency} is not supported by ZHLS`);
    }


    // Snce we've already calculated fees & spread based on a true fixed side, we will always pass FIAT here
    const executedQuote = await this.requestAndExecuteQuote(cryptocurrency, fiatCurrency, amount, CurrencyType.FIAT);

    // TODO(#310) Final slippage check here or already too deep?

    const amountReceived = executedQuote["message"]["quote"].quantity;
    const tradePrice = executedQuote["message"]["quote"].price;
    const quoteID = executedQuote["message"]["quote"].quote_id;

    const assetTransfer = await this.transferAssetsToNoba(
      NOBA_PLATFORM_CODE,
      ZHLS_PLATFORM_CODE,
      NOBA_PLATFORM_CODE,
      NOBA_PLATFORM_CODE,
      cryptocurrency,
      amountReceived,
    );
    if (assetTransfer == null) {
      throw new BadRequestError({
        messageForClient: "Could not get a valid quote! Contact noba support for resolution!",
      });
    }

    this.logger.debug(`Asset transfer: ${JSON.stringify(assetTransfer)}`);
  }

  pollFundsAvailableStatus(id: string) {
    throw new Error("Method not implemented.");
  }

  transferToConsumerAccount(request: ConsumerAccountTransferRequest) {
    throw new Error("Method not implemented.");
    // Gets or creates participant code
    // let participantCode: string =
    //   await this.zerohashService.getParticipantCode(request.consumer, request.transactionCreationTimestamp);

  }

  pollAccountTransferStatus(id: string) {
    throw new Error("Method not implemented.");
  }

  transferToConsumerWallet(request: ConsumerWalletTransferRequest) {
    throw new Error("Method not implemented.");
  }

  pollConsumerWalletTransferStatus(id: string) {
    throw new Error("Method not implemented.");
  }
};