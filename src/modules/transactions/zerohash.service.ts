/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-var-requires */
// TODO: Remove eslint disable later on
import * as axios from "axios";

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
import { ConsumerProps } from "../consumer/domain/Consumer";
import { ConsumerService } from "../consumer/consumer.service";
import { DocumentVerificationStatus, KYCStatus, RiskLevel } from "../consumer/domain/VerificationStatus";
import {
  OnChainState,
  TradeState,
  WithdrawalState,
  ZerohashNetworkFee,
  ZerohashQuote,
  ZerohashTradeResponse,
  ZerohashTradeRequest,
  ZerohashTransfer,
  ZerohashWithdrawalResponse,
  ZerohashTransferResponse,
  ZerohashExecutedQuote,
} from "./domain/ZerohashTypes";

const crypto_ts = require("crypto");

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
    this.logger.info(`Sending ZeroHash request: ${requestString}`);

    try {
      const response = await axios.default[derivedMethod](`https://${this.configs.host}${route}`, options);
      this.logger.debug(`Received response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (err) {
      this.logger.error("Error in ZeroHash Request: " + JSON.stringify(err));

      if (err.response) {
        if (err.response.status === 403) {
          // Generally means we are not using a whitelisted IP to ZH
          this.logger.error("Unable to connect to ZeroHash; confirm whitelisted IP.");
          throw new ServiceUnavailableException(err, "Unable to connect to service provider.");
        }
        if (err.response.status === 400) {
          throw new BadRequestException(err);
        }
      }
      throw err;
    }
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
      throw new InternalServerErrorException("Inconsistencies in returned ZH quote.");
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
      throw new InternalServerErrorException("Inconsistencies in returned ZH quote.");
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
  async executeQuote(quoteID: string): Promise<ZerohashExecutedQuote> {
    const executedQuote = await this.makeRequest("/liquidity/execute", "POST", { quote_id: quoteID });

    return {
      tradePrice: Number(executedQuote["message"]["quote"].price),
      cryptoReceived: Number(executedQuote["message"]["quote"].quantity),
      quoteID: executedQuote["message"]["quote"].quote_id,
      tradeID: executedQuote["message"].trade_id,
      cryptocurrency: executedQuote["message"]["quote"].underlying,
    };
  }

  // Transfer assets from ZHLS to Noba account prior to trade
  async transferAssetsToNoba(asset: string, amount: number): Promise<ZerohashTransferResponse> {
    const transfer = await this.makeRequest("/transfers", "POST", {
      from_participant_code: this.getNobaPlatformCode(),
      from_account_group: ZHLS_PLATFORM_CODE,
      from_account_label: "general",
      to_account_label: "general",
      to_participant_code: this.getNobaPlatformCode(),
      to_account_group: this.getNobaPlatformCode(),
      asset: asset,
      amount: String(amount),
    });

    return {
      transferID: transfer.message.id,
      cryptoAmount: transfer.message.amount,
      cryptocurrency: transfer.message.asset,
    };
  }

  // Trade the crypto from Noba to Custom
  async requestTrade(tradeData) {
    const tradeRequest = await this.makeRequest("/trades", "POST", tradeData);
    return tradeRequest;
  }

  async executeTrade(request: ZerohashTradeRequest): Promise<ZerohashTradeResponse> {
    const tradeData = {
      symbol: request.boughtAssetID + "/" + request.soldAssetID,

      trade_price: String(request.sellAmount / request.buyAmount), // Must be sell / buy
      client_trade_id: request.idempotencyID,
      trade_reporter: request.requestorEmail,
      platform_code: this.getNobaPlatformCode(),
      product_type: "spot",
      trade_type: "regular",
      physical_delivery: true,
      parties_anonymous: false,
      transaction_timestamp: Date.now(),
      bank_fee: this.roundTo2DecimalString(request.totalFiatAmount - request.sellAmount),
      parties: [
        {
          participant_code: request.buyerParticipantCode,
          asset: request.boughtAssetID,
          amount: String(request.buyAmount),
          side: "buy",
          settling: true,
        },
        {
          participant_code: request.sellerParticipantCode,
          asset: request.soldAssetID,
          amount: String(request.sellAmount),
          side: "sell",
          settling: false,
        },
      ],
    };

    const tradeRequest = await this.requestTrade(tradeData);
    if (tradeRequest == null) {
      throw new BadRequestError({
        messageForClient: "Unable to obtain quote. Please try again in several minutes.",
      });
    }

    return {
      tradeID: tradeRequest["message"].trade_id,
    };
  }

  async getTransfer(transferId: string): Promise<ZerohashTransfer> {
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
    return String(withdrawalRequest["message"]["id"]);
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

      case null:
        response.onChainStatus = OnChainState.PENDING;
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
    try {
      // Check trade_state every 3 seconds until it is terminated using setInterval
      const tradeData = await this.makeRequest(`/trades/${tradeId}`, "GET", {});
      this.logger.info(JSON.stringify(tradeData.message.parties));

      const tradeState = tradeData["message"]["trade_state"];
      const settledTimestamp = tradeData.message.settled_timestamp;

      let settlementState: string;
      tradeData.message.parties.forEach(party => {
        if (party.side === "sell") {
          settlementState = tradeData.message.parties[1].settlement_state;
        }
      });

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
            errorMessage: "Trade could not be settled by the expiry time",
            settledTimestamp: null,
          };

        default:
          throw Error(`Unexpected trade state: '${tradeState}'`);
      }
    } catch (err) {
      this.logger.error(`Error while checking trade status: ${JSON.stringify(err)}`);
      // TODO(#): Only send "pending" state if there is an "INTERNAL_ERROR"
      //          as NOT_FOUND status can't be retried.
      return {
        tradeID: tradeId,
        tradeState: TradeState.PENDING,
        settledTimestamp: null,
        errorMessage: null,
      };
    }
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

  private roundTo2DecimalString(num: number): string {
    return num.toFixed(2);
  }
}
