/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-var-requires */
// TODO: Remove eslint disable later on

import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { AppService } from "../../app.service";
import { NOBA_PLATFORM_CODE, ZerohashConfigs, ZHLS_PLATFORM_CODE } from "../../config/configtypes/ZerohashConfigs";
import { ZEROHASH_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { LocationService } from "../common/location.service";
import { CurrencyType, CryptoTransactionHandler } from "../common/domain/Types";
import { ConsumerProps } from "../consumer/domain/Consumer";
import { ConsumerService } from "../consumer/consumer.service";
import { DocumentVerificationStatus, KYCStatus, RiskLevel } from "../consumer/domain/VerificationStatus";
import { Transaction } from "./domain/Transaction";
import { CryptoTransactionRequestResult, CryptoTransactionRequestResultStatus } from "./domain/Types";
import * as axios from 'axios';

const crypto_ts = require("crypto");

@Injectable()
export class ZeroHashService {
  private readonly configs: ZerohashConfigs;
  private readonly appService: AppService;
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

    this.logger.info(`Sending request [${derivedMethod} ${this.configs.host}${route}]:\nBody: ${JSON.stringify(body)}`);

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

  async createParticipant(consumer: ConsumerProps) {
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
      id_number: consumer.socialSecurityNumber, // TODO: Support other types outside US
      signed_timestamp: Date.now(),
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

  async requestQuote(underlyingCurrency: string, quotedCurrency: string, amount: number, fixedSide: CurrencyType) {
    // Set the endpoint URL based on whether we are placing an order based on FIAT amount or CRYPTO amount
    let route: string;
    if (fixedSide === CurrencyType.CRYPTO) {
      this.logger.debug(`Quoting ${amount} ${quotedCurrency} to ${underlyingCurrency}`);
      route = `/liquidity/rfq?underlying=${underlyingCurrency}&quoted_currency=${quotedCurrency}&side=buy&quantity=${amount}`;
    } else {
      this.logger.debug(`Quoting ${amount} ${underlyingCurrency} to ${quotedCurrency}`);
      route = `/liquidity/rfq?underlying=${underlyingCurrency}&quoted_currency=${quotedCurrency}&side=buy&total=${amount}`;
    }

    let quote = await this.makeRequest(route, "GET", {});
    return quote;
  }

  // Execute a liquidity quote
  async executeQuote(quote_id) {
    const executed_trade = await this.makeRequest("/liquidity/execute", "POST", { quote_id: quote_id });
    return executed_trade;
  }

  // Transfer assets from ZHLS to Noba account prior to trade
  async transferAssetsToNoba(
    senderParticipant: string,
    senderGroup: string,
    receiverParticipant: string,
    receiverGroup: string,
    asset: string,
    amount: number,
  ) {
    const transfer = await this.makeRequest("/transfers", "POST", {
      from_participant_code: senderParticipant,
      from_account_group: senderGroup,
      to_participant_code: receiverParticipant,
      to_account_group: receiverGroup,
      asset: asset,
      amount: amount,
    });

    return transfer;
  }

  // Trade the crypto from Noba to Custom
  async requestTrade(tradeData) {
    const tradeRequest = await this.makeRequest("/trades", "POST", tradeData);
    return tradeRequest;
  }

  // Get trade and check status
  // Initiate a withdrawal if trade_status is terminated
  async getTrade(tradeID: string) {
    const tradeData = await this.makeRequest(`/trades/${tradeID}`, "GET", {});
    return tradeData;
  }

  async requestWithdrawal(
    cryptocurrencyAddress: string,
    zhParticipantCode: string,
    amount: number,
    asset: string,
    accountGroup: string,
  ) {
    const withdrawalRequest = await this.makeRequest("/withdrawals/requests", "POST", {
      address: cryptocurrencyAddress,
      participant_code: zhParticipantCode,
      amount: String(amount),
      asset: asset,
      account_group: accountGroup,
    });
    return withdrawalRequest;
  }

  async getWithdrawal(withdrawalID: string) {
    const withdrawal = await this.makeRequest(`/withdrawals/requests/${withdrawalID}`, "GET", {});
    return withdrawal;
  }

  async estimateNetworkFee(underlyingCurrency: string, quotedCurrency: string) {
    const networkFee = await this.makeRequest(
      `/withdrawals/estimate_network_fee?underlying=${underlyingCurrency}&quoted_currency=${quotedCurrency}`,
      "GET",
      {},
    );
    return networkFee;
  }

  async checkStatus(
    consumer: ConsumerProps,
    transaction: Transaction,
    cryptoTransactionHandler: CryptoTransactionHandler,
  ) {
    // Check trade_state every 3 seconds until it is terminated using setInterval
    const trade_status_checker = setInterval(async () => {
      const tradeData = await this.getTrade(transaction.props.cryptoTransactionId);
      const tradeState = tradeData["message"]["trade_state"];
      if (tradeState == "terminated") {
        // This means the trade has finished with a status of settled or defaulted
        // Request withdrawal
        clearInterval(trade_status_checker);
        const withdrawalRequest = await this.requestWithdrawal(
          transaction.props.destinationWalletAddress,
          consumer.zhParticipantCode,
          transaction.props.leg2Amount,
          transaction.props.leg2,
          NOBA_PLATFORM_CODE,
        );

        // TODO(#310) What if we fail right here after requesting withdrawal? We haven't saved the
        // Withdrawal request in order to come back to this polling logic.
        const withdrawalID = withdrawalRequest["message"]["id"];
        const withdrawalStatusChecker = setInterval(async () => {
          const withdrawalData = await this.getWithdrawal(withdrawalID);
          console.log(withdrawalData);
          const withdrawalStatus = withdrawalData["message"][0]["status"];
          if (withdrawalStatus == "SETTLED") {
            clearInterval(withdrawalStatusChecker);
            console.log("Withdrawal completed");

            const transactionHash = withdrawalData["message"][0]["transaction_id"];
            cryptoTransactionHandler.onSettled(transactionHash);
          }
        }, 3000);
      }
    }, 3000);
  }

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
    let participantCode: string = await this.getParticipantCode(consumer);

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

    console.log(`Asset transfer: ${JSON.stringify(assetTransfer)}`);
    // TODO(#310) - movement_id will be null. Need to do polling until settled
    const nobaTransferID = "1234"; // assetTransfer["message"]["movement_id"];
    console.log(`Movement id: ${nobaTransferID}`);

    //Set trade data for next function
    const tradeData = {
      symbol: cryptocurrency + "/" + fiatCurrency,
      trade_price: tradePrice, // TODO(#310) Confirm this comes out correctly
      trade_quantity: String(amount / tradePrice), // TODO(#310) Confirm this comes out correctly
      product_type: "spot",
      trade_type: "regular",
      trade_reporter: consumer.email,
      platform_code: NOBA_PLATFORM_CODE,
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
          participant_code: NOBA_PLATFORM_CODE,
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

  private async requestAndExecuteQuote(
    cryptocurrency: string,
    fiatCurrency: string,
    amount: number,
    fixedSide: CurrencyType,
  ) {
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
    return executedQuote;
  }

  private async getParticipantCode(consumer: ConsumerProps) {
    let participantCode: string = consumer.zhParticipantCode;
    console.log(`Participant code: ${participantCode}`);
    console.log(`Undefined? ${participantCode == undefined} or null? ${participantCode == null}`);
    // If the participant doesn't have a ZH participant code, first look them up and if not existing, create them:
    if (participantCode == undefined) {
      // Check if the user is already registered with ZeroHash
      const participant = await this.getParticipant(consumer.email);
      console.log(`Participant: ${JSON.stringify(participant)}`);
      // If the user is not registered, register them
      if (participant == null) {
        const newParticipant = await this.createParticipant(consumer);
        if (newParticipant == null) {
          this.logger.error("Failed to create participant for email:" + consumer.email);
          throw new BadRequestError({ messageForClient: "Something went wrong. Contact noba support for resolution!" });
        }
        participantCode = newParticipant["message"]["participant_code"];
        // Update consumer record with participant_code
        this.consumerService.addZeroHashParticipantCode(consumer._id, participantCode);
        this.logger.info("Created new participant: " + participantCode);
      } else {
        participantCode = participant["message"]["participant_code"];
        this.consumerService.addZeroHashParticipantCode(consumer._id, participantCode);
        this.logger.info("Existing participant: " + participantCode);
      }
    }

    return participantCode;
  }
}
