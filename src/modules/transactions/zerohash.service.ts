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
import { CurrencyType, Web3TransactionHandler } from "../common/domain/Types";
import { ConsumerProps } from "../consumer/domain/Consumer";
import { ConsumerService } from "../consumer/consumer.service";
import { DocumentVerificationStatus, KYCStatus, RiskLevel } from "../consumer/domain/VerificationStatus";

const crypto_ts = require("crypto");
const request = require("request-promise"); // TODO(#125) This library is deprecated. We need to switch to Axios.

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

    this.logger.debug(
      `Sending request [${derivedMethod} ${this.configs.host}${route}]:\nBody: ${JSON.stringify(body)}`,
    );
    const response = request[derivedMethod](`https://${this.configs.host}${route}`, options).catch(err => {
      if (err.statusCode == 403) {
        // Generally means we are not using a whitelisted IP to ZH
        this.logger.error("Unable to connect to ZeroHash; confirm whitelisted IP.");
        throw new ServiceUnavailableException(err, "Unable to connect to service provider.");
      } else if (err.statusCode == 400) {
        throw new BadRequestException(err);
      } else {
        this.logger.error("Error in ZeroHash Request: " + err.statusCode);
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
  async transferAssetsToNoba(sender_participant, sender_group, receiver_participant, receiver_group, asset, amount) {
    const transfer = await this.makeRequest("/transfers", "POST", {
      from_participant_code: sender_participant,
      from_account_group: sender_group,
      to_participant_code: receiver_participant,
      to_account_group: receiver_group,
      asset: asset,
      amount: amount,
    });

    return transfer;
  }

  // Trade the crypto from Noba to Custom
  async requestTrade(tradeData) {
    const trade_request = await this.makeRequest("/trades", "POST", tradeData);
    return trade_request;
  }

  // Get trade and check status
  // Initiate a withdrawal if trade_status is terminated
  async getTrade(trade_id) {
    const trade_data = await this.makeRequest(`/trades/${trade_id}`, "GET", {});
    return trade_data;
  }

  async requestWithdrawal(digital_address, participant_code, amount, asset, account_group) {
    const withdrawal_request = await this.makeRequest("/withdrawals/requests", "POST", {
      address: digital_address,
      participant_code: participant_code,
      amount: amount,
      asset: asset,
      account_group: account_group,
    });
    return withdrawal_request;
  }

  async getWithdrawal(withdrawal_id) {
    const withdrawal = await this.makeRequest(`/withdrawals/requests/${withdrawal_id}`, "GET", {});
    return withdrawal;
  }

  async estimateNetworkFee(underlying, quoted_currency) {
    const network_fee = await this.makeRequest(
      `/withdrawals/estimate_network_fee?underlying=${underlying}&quoted_currency=${quoted_currency}`,
      "GET",
      {},
    );
    return network_fee;
  }

  async transferCryptoToDestinationWallet(
    consumer: ConsumerProps,
    quoted_currency: string,
    cryptocurrency: string,
    destination_wallet: string,
    amount: number,
    cryptoAmount: number, //TODO remove this
    amount_type: CurrencyType,
    web3TransactionHandler: Web3TransactionHandler,
  ) {
    // Ensure that the cryptocurrency and quoted_currency are supported by ZHLS
    var {
      trade_id,
      participant_code,
      amount_received,
    }: { trade_id: any; participant_code: string; amount_received: any } = await this.initiateCryptoTransfer(
      consumer,
      quoted_currency,
      cryptocurrency,
      amount,
      amount_type,
    );

    // Check trade_state every 3 seconds until it is terminated using setInterval
    const trade_status_checker = setInterval(async () => {
      const trade_data = await this.getTrade(trade_id);
      const trade_state = trade_data["message"]["trade_state"];
      if (trade_state == "terminated") {
        clearInterval(trade_status_checker);
        const withdrawal_request = await this.requestWithdrawal(
          destination_wallet,
          participant_code,
          amount_received,
          cryptocurrency,
          NOBA_PLATFORM_CODE,
        );

        const withdrawal_id = withdrawal_request["message"]["id"];
        const withdrawal_status_checker = setInterval(async () => {
          const withdrawal_data = await this.getWithdrawal(withdrawal_id);
          console.log(withdrawal_data);
          const withdrawal_state = withdrawal_data["message"][0]["status"];
          if (withdrawal_state == "SETTLED") {
            clearInterval(withdrawal_status_checker);
            console.log("Withdrawal completed");
            const withdrawal_data = await this.getWithdrawal(withdrawal_id);
            const tx_hash = withdrawal_data["message"][0]["transaction_id"];
            web3TransactionHandler.onTransactionHash(tx_hash);
          }
        }, 3000);
      }
    }, 3000);
  }

  async initiateCryptoTransfer(
    consumer: ConsumerProps,
    fiatCurrency: string,
    cryptocurrency: string,
    amount: number,
    amount_type: CurrencyType,
  ) {
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

    let participant_code: string = await this.getParticipantCode(consumer);

    const executedQuote = await this.requestAndExecuteQuote(cryptocurrency, fiatCurrency, amount, amount_type);

    const amountReceived = executedQuote["message"]["quote"].quantity;
    const tradePrice = executedQuote["message"]["quote"].price;

    //TODO: Update transaction with quote details

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

    //Set trade data for next function
    const tradeData = {
      symbol: cryptocurrency + "/" + fiatCurrency,
      trade_price: tradePrice,
      trade_quantity: String(amount / tradePrice), // TODO(#310) Confirm this comes out correctly
      product_type: "spot",
      trade_type: "regular",
      trade_reporter: consumer.email,
      platform_code: NOBA_PLATFORM_CODE,
      client_trade_id: "client_trade_id",
      physical_delivery: true,
      parties_anonymous: false,
      transaction_timestamp: Date.now(),
      parties: [
        {
          participant_code: participant_code,
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

    const trade_request = await this.requestTrade(tradeData);
    if (trade_request == null) {
      throw new BadRequestError({
        messageForClient: "Could not get a valid quote! Contact noba support for resolution!",
      });
    }

    const trade_id = trade_request["message"].trade_id;
    return { trade_id, participant_code, amount_received: amountReceived };
  }

  private async requestAndExecuteQuote(
    cryptocurrency: string,
    quoted_currency: string,
    amount: number,
    amount_type: CurrencyType,
  ) {
    const quote = await this.requestQuote(cryptocurrency, quoted_currency, amount, amount_type);
    if (quote == null) {
      throw new BadRequestError({
        messageForClient: "Could not get a valid quote! Contact noba support for resolution!",
      });
    }
    const quote_id = quote["message"].quote_id;

    const executed_quote = await this.executeQuote(quote_id);
    if (executed_quote == null) {
      throw new BadRequestError({
        messageForClient: "Something went wrong! Contact noba support for immediate resolution!",
      });
    }
    return executed_quote;
  }

  private async getParticipantCode(consumer: ConsumerProps) {
    let participant_code: string = consumer.zhParticipantCode;
    // If the participant doesn't have a ZH participant code, first look them up and if not existing, create them:
    if (participant_code == undefined) {
      // Check if the user is already registered with ZeroHash
      const participant = await this.getParticipant(consumer.email);

      // If the user is not registered, register them
      if (participant == null) {
        const new_participant = await this.createParticipant(consumer);
        if (new_participant == null) {
          this.logger.error("Failed to create participant for email:" + consumer.email);
          throw new BadRequestError({ messageForClient: "Something went wrong. Contact noba support for resolution!" });
        }
        participant_code = new_participant["message"]["participant_code"];
        // Update consumer record with participant_code
        this.consumerService.addZeroHashParticipantCode(consumer._id, participant_code);
        this.logger.debug("Created new participant: " + participant_code);
      } else {
        participant_code = participant["message"]["participant_code"];
        this.logger.debug("Existing participant: " + participant_code);
      }
    }
    return participant_code;
  }
}
