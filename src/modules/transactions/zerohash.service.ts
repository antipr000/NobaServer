/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-var-requires */
// TODO: Remove eslint disable later on

import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { AppService } from "../../app.service";
import { ZerohashConfigs, ZHLS_PLATFORM_CODE } from "../../config/configtypes/ZerohashConfigs";
import { ZEROHASH_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { LocationService } from "../common/location.service";
import { CurrencyType } from "../common/domain/Types";
import { ConsumerProps } from "../consumer/domain/Consumer";
import { ConsumerService } from "../consumer/consumer.service";
import { DocumentVerificationStatus, KYCStatus, RiskLevel } from "../consumer/domain/VerificationStatus";
import { Transaction } from "./domain/Transaction";
import { CryptoTransactionRequestResult, CryptoTransactionRequestResultStatus } from "./domain/Types";
import {
  ExecutedQuote,
  OnChainState,
  TradeState,
  WithdrawalState,
  ZerohashNetworkFee,
  ZerohashQuote,
  ZerohashTradeResponse,
  ZerohashTradeRquest,
  ZerohashTransfer,
  ZerohashWithdrawalResponse,
} from "./domain/ZerohashTypes";

const crypto_ts = require("crypto");
const request = require("request-promise"); // TODO(#125) This library is deprecated. We need to switch to Axios.

@Injectable()
export class ZeroHashService {
  private readonly configs: ZerohashConfigs;
  private readonly appService: AppService;
  @Inject()
  private readonly locationService: LocationService;

  @Inject()
  private readonly consumerService: ConsumerService;

  // ID Types
  private readonly id_options = [
    "ssn",
    "us_drivers_license",
    "us_passport",
    "us_passport_card",
    "us_permanent_resident_card",
    "us_border_crossing_card",
    "us_alien_card",
    "us_id_card",
    "non_us_passport",
    "non_us_other",
  ];

  constructor(
    configService: CustomConfigService,
    appService: AppService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.configs = configService.get<ZerohashConfigs>(ZEROHASH_CONFIG_KEY);
    this.appService = appService;
  }

  getNobaPlatformCode(): string {
    return this.configs.platformCode;
  }

  // THIS IS THE FUNCTION TO CREATE AN AUTHENTICATED AND SIGNED REQUEST
  // TODO: For some reason Gal said that we have to use the deprecated make-request package for now. Change this later!
  async makeRequest(route, method, body) {
    // CREATE SIGNATURE
    const timestamp = Math.round(Date.now() / 1000);
    const payload = timestamp + method + route + JSON.stringify(body);
    const decodedSecret = Buffer.from(this.configs.apiSecret, "base64");
    const hmac = crypto_ts.createHmac("sha256", decodedSecret);
    // Don't forget to base 64 encode your digest
    const signedPayload = hmac.update(payload).digest("base64");

    // SET HEADERS
    const headers = {
      "X-SCX-API-KEY": this.configs.apiKey,
      "X-SCX-SIGNED": signedPayload,
      "X-SCX-TIMESTAMP": timestamp,
      "X-SCX-PASSPHRASE": this.configs.passPhrase,
    };

    const derivedMethod = {
      POST: "post",
      PUT: "put",
      GET: "get",
    }[method];

    const options = {
      methods: derivedMethod,
      headers,
      body,
      json: true,
    };

    const requestString = `[${derivedMethod} ${this.configs.host}${route}]:\nBody: ${JSON.stringify(body)}`;
    this.logger.debug(`Sending request: ${requestString}`);

    const response = request[derivedMethod](`https://${this.configs.host}${route}`, options).catch(err => {
      if (err.statusCode == 403) {
        // Generally means we are not using a whitelisted IP to ZH
        this.logger.error("Unable to connect to ZeroHash; confirm whitelisted IP.");
        throw new ServiceUnavailableException(err, "Unable to connect to service provider.");
      } else if (err.statusCode == 400) {
        this.logger.error(`Error in ZeroHash request: ${requestString}`);
        this.logger.error(JSON.stringify(err));
        throw new BadRequestException(err);
      } else {
        // catch 404 in caller. This may be for known reasons (e.g. participant not created yet) so we don't want to log it here.
        throw err;
      }
    });
    this.logger.debug(`Received response: ${JSON.stringify(response)}`);
    return response;
  }

  async getPrice(underlying, quoted_currency) {
    let price = await this.makeRequest(`/index?underlying=${underlying}&quoted_currency=${quoted_currency}`, "GET", {});
    return price;
  }

  async getAccounts() {
    const accounts = await this.makeRequest("/accounts", "GET", {});
    return accounts;
  }

  async createParticipant(consumer: ConsumerProps, transactionTimestamp: Date) {
    if (consumer.verificationData.kycVerificationStatus != KYCStatus.APPROVED) {
      return null; // Is handled in the caller
    }

    if (
      consumer.verificationData.documentVerificationStatus != DocumentVerificationStatus.APPROVED &&
      consumer.verificationData.documentVerificationStatus != DocumentVerificationStatus.NOT_REQUIRED
    ) {
      return null; // Is handled in the caller
    }

    if (consumer.verificationData.sanctionLevel == RiskLevel.HIGH) {
      return null; // Is handled in the caller
    }

    const country = this.locationService.getLocationDetails(consumer.address.countryCode);

    const consumerData = {
      first_name: consumer.firstName,
      last_name: consumer.lastName,
      email: consumer.email,
      address_one: consumer.address.streetLine1,
      address_two: consumer.address.streetLine2,
      city: consumer.address.city,
      state: consumer.address.regionCode,
      zip: consumer.address.postalCode,

      country: country.alternateCountryName, // ZH has its own spellings for some of the countries, so we store that in alternateCountryName
      date_of_birth: consumer.dateOfBirth, // ZH format and our format are both YYYY-MM-DD
      id_number_type: "ssn", // TODO: Support other types outside US
      id_number: await this.consumerService.getDecryptedSSN(consumer), // TODO: Support other types outside US
      signed_timestamp: transactionTimestamp.getTime(),
      metadata: {
        cip_kyc: "Pass", // We do not allow failed KYC to get here, so this is always pass
        cip_timestamp: consumer.verificationData.kycVerificationTimestamp,
        sanction_screening: "Pass", // We do not allow failed sanctions screening to get here, so this is always pass
        sanction_screening_timestamp: consumer.verificationData.kycVerificationTimestamp,
      },
      risk_rating: consumer.riskRating,
    };

    let participant = await this.makeRequest("/participants/customers/new", "POST", consumerData);
    return participant;
  }

  async getParticipant(email) {
    let participant = await this.makeRequest(`/participants/${email}`, "GET", {});
    this.logger.debug("Returning participant: " + participant);
    return participant;
  }

  async getAllParticipants() {
    const participants = await this.makeRequest("/participants", "GET", {});
    return participants;
  }

  /**
   * @deprecated: Use AssetService methods instead of this.
   * This will be removed as soon as the changes are working in staging/production envs.
   */
  async requestQuote(cryptocurrency: string, fiatCurrency: string, amount: number, fixedSide: CurrencyType) {
    // Set the endpoint URL based on whether we are placing an order based on FIAT amount or CRYPTO amount
    let route: string;
    if (fixedSide === CurrencyType.CRYPTO) {
      this.logger.debug(`Quoting ${amount} ${fiatCurrency} to ${cryptocurrency}`);
      route = `/liquidity/rfq?underlying=${cryptocurrency}&quoted_currency=${fiatCurrency}&side=buy&quantity=${amount}`;
    } else {
      this.logger.debug(`Quoting ${amount} ${cryptocurrency} to ${fiatCurrency}`);
      route = `/liquidity/rfq?underlying=${cryptocurrency}&quoted_currency=${fiatCurrency}&side=buy&total=${amount}`;
    }

    let quote = await this.makeRequest(route, "GET", {});
    return quote;
  }

  /**
   * Returns quote worth the specified Fiat amount.
   */
  async requestQuoteForFixedFiatCurrency(
    cryptoCurrency: string,
    fiatCurrency: string,
    fiatAmount: number,
  ): Promise<ZerohashQuote> {
    /**
     * Either "quantity" or "total" parameters should be provided -
     *
     * quantity:  The amount of the "underlying" currency for the quote
     * total:     The desired amount of the "quoted_currency" for the quote
     */
    const route = `/liquidity/rfq?underlying=${cryptoCurrency}&quoted_currency=${fiatCurrency}&side=buy&total=${fiatAmount}`;
    const quote = await this.makeRequest(route, "GET", {});

    if (quote["message"].underlying !== cryptoCurrency || quote["message"].quoted_currency !== fiatCurrency) {
      this.logger.error(`Returned quote for route "${route}": "${JSON.stringify(quote)}"`);
      throw new InternalServerErrorException(`Inconsistencies in returned ZH quote.`);
    }

    return {
      quoteID: quote["message"].quote_id,
      expireTimestamp: quote["message"].expire_ts,
      cryptoCurrency: quote["message"].underlying,
      fiatCurrency: quote["message"].quoted_currency,
      perUnitCryptoAssetCost: quote["message"].price,
    };
  }

  /**
   * Returns quote worth the specified Crypto quantity.
   */
  async requestQuoteForDesiredCryptoQuantity(
    cryptoCurrency: string,
    fiatCurrency: string,
    cryptoQuantity: number,
  ): Promise<ZerohashQuote> {
    /**
     * Either "quantity" or "total" parameters should be provided -
     *
     * quantity:  The amount of the "underlying" currency for the quote
     * total:     The desired amount of the "quoted_currency" for the quote
     */
    const route = `/liquidity/rfq?underlying=${cryptoCurrency}&quoted_currency=${fiatCurrency}&side=buy&quantity=${cryptoQuantity}`;
    const quote = await this.makeRequest(route, "GET", {});

    if (quote["message"].underlying !== cryptoCurrency || quote["message"].quoted_currency !== fiatCurrency) {
      this.logger.error(`Returned quote for route "${route}": "${JSON.stringify(quote)}"`);
      throw new InternalServerErrorException(`Inconsistencies in returned ZH quote.`);
    }

    return {
      quoteID: quote["message"].quote_id,
      expireTimestamp: quote["message"].expire_ts,
      cryptoCurrency: quote["message"].underlying,
      fiatCurrency: quote["message"].quoted_currency,
      perUnitCryptoAssetCost: quote["message"].price,
    };
  }

  // Execute a liquidity quote
  async executeQuote(quote_id) {
    const executed_trade = await this.makeRequest("/liquidity/execute", "POST", { quote_id: quote_id });
    return executed_trade;
  }

  // Transfer assets from ZHLS to Noba account prior to trade
  async transferAssetsToNoba(asset: string, amount: number): Promise<string> {
    const transfer = await this.makeRequest("/transfers", "POST", {
      from_participant_code: this.getNobaPlatformCode(),
      from_account_group: ZHLS_PLATFORM_CODE,
      from_account_label: "general",
      to_account_label: "general",
      to_participant_code: this.getNobaPlatformCode(),
      to_account_group: this.getNobaPlatformCode(),
      asset: asset,
      amount: amount,
    });

    console.log(transfer);
    return transfer.message.id;
  }

  // Trade the crypto from Noba to Custom
  async requestTrade(tradeData) {
    const tradeRequest = await this.makeRequest("/trades", "POST", tradeData);
    return tradeRequest;
  }

  async executeTrade(request: ZerohashTradeRquest): Promise<ZerohashTradeResponse> {
    const tradeData = {
      symbol: request.boughtAssetID + "/" + request.soldAssetId,

      trade_price: String(request.tradePrice),
      trade_quantity: String(request.tradeAmount / request.tradePrice),
      client_trade_id: request.idempotencyID,

      trade_reporter: request.requestorEmail,
      platform_code: this.getNobaPlatformCode(),

      product_type: "spot",
      trade_type: "regular",
      physical_delivery: true,
      parties_anonymous: false,
      transaction_timestamp: Date.now(),

      parties: [
        {
          participant_code: request.buyerParticipantCode,
          asset: request.boughtAssetID,
          amount: String(request.tradeAmount),
          side: "buy",
          settling: true,
        },
        {
          participant_code: request.sellerParticipantCode,
          asset: request.soldAssetId,
          side: "sell",
          settling: false,
        },
      ],
    };

    const tradeRequest = await this.requestTrade(tradeData);
    if (tradeRequest == null) {
      throw new BadRequestError({
        messageForClient: "Could not get a valid quote! Contact noba support for resolution!",
      });
    }

    return {
      tradeID: tradeRequest["message"].trade_id,
    };
  }

  // Get trade and check status
  // Initiate a withdrawal if trade_status is terminated
  async getTrade(tradeID: string) {
    const tradeData = await this.makeRequest(`/trades/${tradeID}`, "GET", {});
    return tradeData;
  }

  async getTransfer(transferId: string): Promise<ZerohashTransfer> {
    console.log(transferId);
    const response = await this.makeRequest(`/transfers/${transferId}`, "GET", {});
    return {
      id: response.message.id,
      createdAt: new Date(response.message.created_at),
      updatedAt: new Date(response.message.updated_at),
      status: response.message.status,
      asset: response.message.asset,
      movementID: response.message.movement_id,
    };
  }

  async requestWithdrawal(
    cryptocurrencyAddress: string,
    amount: number,
    asset: string,
    zhParticipantCode: string,
    accountGroup: string,
  ): Promise<string> {
    const withdrawalRequest = await this.makeRequest("/withdrawals/requests", "POST", {
      address: cryptocurrencyAddress,
      participant_code: zhParticipantCode,
      amount: String(amount),
      asset: asset,
      account_group: accountGroup,
    });
    return withdrawalRequest["message"]["id"];
  }

  async getWithdrawal(withdrawalID: string): Promise<ZerohashWithdrawalResponse> {
    const withdrawal = await this.makeRequest(`/withdrawals/requests/${withdrawalID}`, "GET", {});

    const response: ZerohashWithdrawalResponse = {
      gasPrice: withdrawal["message"][0]["gas_price"],
      requestedAmount: Number(withdrawal["message"][0]["requested_amount"]),
      settledAmount: withdrawal["message"][0]["settled_amount"],
      onChainTransactionID: withdrawal["message"][0]["transaction_id"],

      onChainStatus: OnChainState.PENDING,
      withdrawalStatus: WithdrawalState.PENDING,
    };

    switch (String(withdrawal["message"][0]["status"])) {
      case "PENDING":
        response.withdrawalStatus = WithdrawalState.PENDING;
        break;

      case "APPROVED":
        response.withdrawalStatus = WithdrawalState.APPROVED;
        break;

      case "REJECTED":
        response.withdrawalStatus = WithdrawalState.REJECTED;
        break;

      case "SETTLED":
        response.withdrawalStatus = WithdrawalState.SETTLED;
        break;

      default:
        this.logger.error(`Unexpected withdrawal status: "${withdrawal["message"][0]["status"]}"`);
        response.withdrawalStatus = WithdrawalState.REJECTED;
    }

    switch (withdrawal["message"][0]["on_chain_status"]) {
      case "PENDING":
        response.onChainStatus = OnChainState.PENDING;
        break;

      case "CONFIRMED":
        response.onChainStatus = OnChainState.CONFIRMED;
        break;

      default:
        this.logger.error(`Unexpected on-chain status: "${withdrawal["message"][0]["on_chain_status"]}"`);
        response.onChainStatus = OnChainState.ERROR;
    }

    return response;
  }

  async estimateNetworkFee(cryptoCurrency: string, fiatCurrency: string): Promise<ZerohashNetworkFee> {
    const networkFee = await this.makeRequest(
      `/withdrawals/estimate_network_fee?underlying=${cryptoCurrency}&quoted_currency=${fiatCurrency}`,
      "GET",
      {},
    );
    return {
      cryptoCurrency: cryptoCurrency,
      // TODO(#): Check with ZH if this is actually fees in crypto.
      feeInCrypto: Number(networkFee["message"]["network_fee_quantity"]),

      fiatCurrency: fiatCurrency,
      feeInFiat: Number(networkFee["message"]["total_notional"]),
    };
  }

  async checkTradeStatus(tradeId: string): Promise<ZerohashTradeResponse> {
    // Check trade_state every 3 seconds until it is terminated using setInterval
    const tradeData = await this.getTrade(tradeId);
    this.logger.info(JSON.stringify(tradeData.message.parties));

    const tradeState = tradeData["message"]["trade_state"];
    const settledTimestamp = tradeData.message.settled_timestamp;
    // TODO(#): Update the index of "parties" after ZH discussion ends.
    const settlementState = tradeData.message.parties[1].settlement_state;

    /* 
      From ZH docs:
      Trade State
      - accepted means the trade has been accepted by Zero Hash for settlement.
      - active means the trade is actively being settled.
      - terminated means the trade is in a terminal state, and has a settlement_state of either settled or defaulted.
    */
    switch (tradeState) {
      case "accepted":
        return {
          tradeID: tradeId,
          tradeState: TradeState.PENDING,
          settledTimestamp: null,
          errorMessage: null,
        };

      case "active":
        return {
          tradeID: tradeId,
          tradeState: TradeState.PENDING,
          settledTimestamp: null,
          errorMessage: null,
        };

      case "terminated":
        if (settlementState === "settled") {
          return {
            tradeID: tradeId,
            tradeState: TradeState.SETTLED,
            settledTimestamp: settledTimestamp,
            errorMessage: null,
          };
        }
        return {
          tradeID: tradeId,
          tradeState: TradeState.DEFAULTED,
          errorMessage: `Trade could not be settled by the expiry time`,
          settledTimestamp: null,
        };

      default:
        throw Error(`Unexpected trade state: '${tradeState}'`);
    }
  }

  // [DEPRECATED]: Use AssetService interface instead of this.
  // Will be removed once the transaction is working in staging/production.
  async moveCryptoToConsumerWallet(consumer: ConsumerProps, transaction: Transaction): Promise<string> {
    // If we already have a zhWithdrawalID then DO NOT make another request!
    let withdrawalID = transaction.props.zhWithdrawalID;
    this.logger.info("Existing withdrawal ID: " + withdrawalID);
    if (!withdrawalID) {
      const withdrawalRequest = await this.requestWithdrawal(
        transaction.props.destinationWalletAddress,
        transaction.props.leg2Amount,
        transaction.props.leg2,
        consumer.zhParticipantCode,
        this.getNobaPlatformCode(),
      );

      withdrawalID = withdrawalRequest["message"]["id"];
      this.logger.info("New withdrawal ID: " + withdrawalID);
    }

    return withdrawalID;
  }

  // [DEPRECATED]: Use AssetService interface instead.
  // Will be removed once everything works in staging.
  async initiateCryptoTransfer(
    consumer: ConsumerProps,
    transaction: Transaction,
  ): Promise<CryptoTransactionRequestResult> {
    let returnStatus = CryptoTransactionRequestResultStatus.FAILED;

    const fiatCurrency = transaction.props.leg1;
    const cryptocurrency = transaction.props.leg2;
    const amount = transaction.props.leg1Amount;

    const supportedCryptocurrencies = await this.appService.getSupportedCryptocurrencies();
    const supportedFiatCurrencies = await this.appService.getSupportedFiatCurrencies();
    if (supportedCryptocurrencies.filter(curr => curr.ticker === cryptocurrency).length == 0) {
      throw new BadRequestError({
        messageForClient: `Unsupported cryptocurrency: ${cryptocurrency}`,
      });
    }

    if (supportedFiatCurrencies.filter(curr => curr.ticker === fiatCurrency).length == 0) {
      throw new Error(`${fiatCurrency} is not supported by ZHLS`);
    }

    // Gets or creates participant code
    let participantCode: string = await this.getParticipantCode(consumer, transaction.props.transactionTimestamp);

    // Snce we've already calculated fees & spread based on a true fixed side, we will always pass FIAT here
    const executedQuote = await this.requestAndExecuteQuote(cryptocurrency, fiatCurrency, amount, CurrencyType.FIAT);

    // TODO(#310) Final slippage check here or already too deep?

    const amountReceived = executedQuote["message"]["quote"].quantity;
    const tradePrice = executedQuote["message"]["quote"].price;
    const quoteID = executedQuote["message"]["quote"].quote_id;

    const assetTransfer = await this.transferAssetsToNoba(cryptocurrency, amountReceived);
    if (assetTransfer == null) {
      throw new BadRequestError({
        messageForClient: "Could not get a valid quote! Contact noba support for resolution!",
      });
    }

    this.logger.debug(`Asset transfer: ${JSON.stringify(assetTransfer)}`);
    // TODO(#310) - movement_id will be null. Need to do polling until settled
    const nobaTransferID = "1234"; // assetTransfer["message"]["movement_id"];
    this.logger.debug(`Movement id: ${nobaTransferID}`);

    //Set trade data for next function
    const tradeData = {
      symbol: cryptocurrency + "/" + fiatCurrency,
      trade_price: tradePrice, // TODO(#310) Confirm this comes out correctly
      trade_quantity: String(amount / tradePrice), // TODO(#310) Confirm this comes out correctly
      product_type: "spot",
      trade_type: "regular",
      trade_reporter: consumer.email,
      platform_code: this.getNobaPlatformCode(),
      client_trade_id: transaction.props._id,
      physical_delivery: true,
      parties_anonymous: false,
      transaction_timestamp: Date.now(),
      parties: [
        {
          participant_code: participantCode,
          asset: cryptocurrency,
          amount: String(amount),
          side: "buy",
          settling: true,
        },
        {
          participant_code: this.getNobaPlatformCode(),
          asset: fiatCurrency,
          side: "sell",
          settling: false,
        },
      ],
    };

    const tradeRequest = await this.requestTrade(tradeData);
    if (tradeRequest == null) {
      throw new BadRequestError({
        messageForClient: "Could not get a valid quote! Contact noba support for resolution!",
      });
    }

    const tradeID = tradeRequest["message"].trade_id;

    returnStatus = CryptoTransactionRequestResultStatus.INITIATED;

    return {
      status: returnStatus,
      amountReceived,
      exchangeRate: tradePrice,
      quoteID,
      nobaTransferID: nobaTransferID,
      tradeID,
    };
  }

  async requestAndExecuteQuote(
    cryptocurrency: string,
    fiatCurrency: string,
    amount: number,
    fixedSide: CurrencyType,
  ): Promise<ExecutedQuote> {
    const quote = await this.requestQuote(cryptocurrency, fiatCurrency, amount, fixedSide);
    if (quote == null) {
      throw new BadRequestError({
        messageForClient: "Could not get a valid quote! Contact noba support for resolution!",
      });
    }
    const quoteID = quote["message"].quote_id;

    const executedQuote = await this.executeQuote(quoteID);
    if (executedQuote == null) {
      throw new BadRequestError({
        messageForClient: "Something went wrong! Contact noba support for immediate resolution!",
      });
    }

    return {
      tradePrice: executedQuote["message"]["quote"].price,
      cryptoReceived: executedQuote["message"]["quote"].quantity,
      quoteID: executedQuote["message"]["quote"].quote_id,
    };
  }

  async getParticipantCode(consumer: ConsumerProps, transactionTimestamp: Date) {
    let participantCode: string = consumer.zhParticipantCode;
    // If the participant doesn't have a ZH participant code, first look them up and if not existing, create them:
    if (participantCode == undefined) {
      let participant: string;
      // Check if the user is already registered with ZeroHash
      try {
        participant = await this.getParticipant(consumer.email);
      } catch (e) {
        // Generally just a 404 here, but log anyway.
        this.logger.info(`Error looking up participant ${consumer.email} (possibly not created yet, which is OK)`);
      }
      // If the user is not registered, register them
      if (participant == null) {
        const newParticipant = await this.createParticipant(consumer, transactionTimestamp);
        if (newParticipant == null) {
          this.logger.error("Failed to create participant for email:" + consumer.email);
          throw new BadRequestError({ messageForClient: "Something went wrong. Contact noba support for resolution!" });
        }
        participantCode = newParticipant["message"]["participant_code"];
        // Update consumer record with participant_code
        await this.consumerService.addZeroHashParticipantCode(consumer._id, participantCode);
        this.logger.debug("Created new participant: " + participantCode);
      } else {
        participantCode = participant["message"]["participant_code"];
        await this.consumerService.addZeroHashParticipantCode(consumer._id, participantCode);
        this.logger.debug("Existing participant: " + participantCode);
      }
    }

    return participantCode;
  }
}
