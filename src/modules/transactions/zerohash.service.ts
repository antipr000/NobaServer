/* eslint-disable @typescript-eslint/no-var-requires */
// TODO: Remove eslint disable later on

import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { Logger } from "winston";
import { Web3TransactionHandler } from "../common/domain/Types";
import { ConsumerProps } from "../consumer/domain/Consumer";

const crypto_ts = require("crypto");
const request = require("request-promise");

@Injectable()
export class ZeroHashService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly host: string;

  // TODO: Get the following from AWS Secrets instead of hardcoding here
  private readonly apiKey = "uCeknMhWLfW4CBLQ6uT39k";
  private readonly apiSecret = "4jtj1kUm64LKiXE7i7DjpLqb2le/yJmLhcQlHzsSno8=";
  private readonly passphrase = "noba_zerohash_sandbox";

  // Test and prod endpoints for zerohash
  private readonly environments = {
    prod: "api.zerohash.com",
    test: "api.cert.zerohash.com",
  };

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

  constructor() {
    // TODO: Make the decision to get this dynamic instead of hardcoding
    this.host = this.environments.test;
  }

  // THIS IS THE FUNCTION TO CREATE AN AUTHENTICATED AND SIGNED REQUEST
  // TODO: For some reason Gal said that we have to use the deprecated make-request package for now. Change this later!
  async makeRequest(route, method, body) {
    // CREATE SIGNATURE
    const timestamp = Math.round(Date.now() / 1000);
    const payload = timestamp + method + route + JSON.stringify(body);
    const decodedSecret = Buffer.from(this.apiSecret, "base64");
    const hmac = crypto_ts.createHmac("sha256", decodedSecret);
    // Don't forget to base 64 encode your digest
    const signedPayload = hmac.update(payload).digest("base64");

    // SET HEADERS
    const headers = {
      "X-SCX-API-KEY": this.apiKey,
      "X-SCX-SIGNED": signedPayload,
      "X-SCX-TIMESTAMP": timestamp,
      "X-SCX-PASSPHRASE": this.passphrase,
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

    const response = request[derivedMethod](`https://${this.host}${route}`, options);
    return response;
  }

  async getPrice(underlying, quoted_currency) {
    let price;
    try {
      price = await this.makeRequest(`/index?underlying=${underlying}&quoted_currency=${quoted_currency}`, "GET", {});
    } catch {
      price = null;
    }
    return price;
  }

  async getAccounts() {
    const accounts = await this.makeRequest("/accounts", "GET", {});
    return accounts;
  }

  async createParticipant(consumer: ConsumerProps) {
    // TODO: This is a dummy userData
    const consumerData = {
      first_name: consumer.firstName,
      last_name: consumer.lastName,
      email: consumer.email,
      address_one: consumer.address.streetLine1,
      address_two: consumer.address.streetLine2,
      city: consumer.address.city,
      state: consumer.address.regionCode,
      zip: consumer.address.postalCode,
      country: "United States", // Remove hardcoded value and use countryCode to determine name
      date_of_birth: consumer.dateOfBirth, // ZH format and our format are both YYYY-MM-DD
      id_number_type: "ssn", // TODO: Support other types outside US
      id_number: consumer.socialSecurityNumber, // TODO: Support other types outside US
      signed_timestamp: 1603378501286, // TODO: What's the correct value to use here?
      metadata: {},
      risk_rating: consumer.riskRating, // TODO: Update to user.riskRating after user refactoring
    };
    console.log(consumerData);
    let participant;
    try {
      participant = await this.makeRequest("/participants/customers/new", "POST", consumerData);
    } catch (e) {
      console.log(e);
      participant = null;
    }
    return participant;
  }

  async getParticipant(email) {
    let participant;
    try {
      participant = await this.makeRequest(`/participants/${email}`, "GET", {});
    } catch {
      participant = null;
    }
    //  {"participant_code":"IQ8THH","email":"mm2@email.com"}
    return participant;
  }

  async getAllParticipants() {
    const participants = this.makeRequest("/participants", "GET", {});
    return participants;
  }

  async requestQuote(underlying, quoted_currency, amount, amount_type) {
    // Set the endpoint URL based on whether we are placing an order based on FIAT amount or CRYPTO amount
    let route: string;
    if (amount_type == "fiat") {
      route = `/liquidity/rfq?underlying=${underlying}&quoted_currency=${quoted_currency}&side=buy&total=${amount}`;
    } else {
      route = `/liquidity/rfq?underlying=${underlying}&quoted_currency=${quoted_currency}&side=buy&quantity=${amount}`;
    }

    let quote;
    try {
      quote = this.makeRequest(route, "GET", {});
    } catch {
      quote = null;
    }
    return quote;
  }

  // Execute a liquidity quote
  async executeQuote(quote_id) {
    let executed_trade;
    try {
      executed_trade = this.makeRequest("/liquidity/execute", "POST", { quote_id: quote_id });
    } catch {
      executed_trade = null;
    }
    return executed_trade;
  }

  // Transfer assets from ZHLS to Noba account prior to trade
  async transferAssets(sender_participant, sender_group, receiver_participant, receiver_group, asset, amount) {
    let transfer;
    try {
      transfer = this.makeRequest("/transfers", "POST", {
        from_participant_code: sender_participant,
        from_account_group: sender_group,
        to_participant_code: receiver_participant,
        to_account_group: receiver_group,
        asset: asset,
        amount: amount,
      });
    } catch {
      transfer = null;
    }
    return transfer;
  }

  // Trade the crypto from Noba to Custom
  async requestTrade(tradeData) {
    let trade_request;
    try {
      trade_request = this.makeRequest("/trades", "POST", tradeData);
    } catch {
      trade_request = null;
    }
    return trade_request;
  }

  // Get trade and check status
  // Initiate a withdrawal if trade_status is terminated
  async getTrade(trade_id) {
    let trade_data;
    try {
      trade_data = this.makeRequest(`/trades/${trade_id}`, "GET", {});
    } catch {
      trade_data = null;
    }
    return trade_data;
  }

  async requestWithdrawal(digital_address, participant_code, amount, asset, account_group) {
    let withdrawal_request;
    try {
      withdrawal_request = this.makeRequest("/withdrawals/requests", "POST", {
        address: digital_address,
        participant_code: participant_code,
        amount: amount,
        asset: asset,
        account_group: account_group,
      });
    } catch {
      withdrawal_request = null;
    }

    return withdrawal_request;
  }

  async getWithdrawal(withdrawal_id) {
    let withdrawal;
    try {
      withdrawal = this.makeRequest(`/withdrawals/requests/${withdrawal_id}`, "GET", {});
    } catch {
      withdrawal = null;
    }
    return withdrawal;
  }

  async getSupportedUnderlying() {
    // TODO: See if there is a dynamic way of getting these using ZeroHash APIs
    return ["ETH"];
  }

  async getSupportedQuotedCurrency() {
    // Return crypto assets supported by ZHLS
    return ["USD"];
  }

  async transferCryptoToDestinationWallet(
    consumer: ConsumerProps,
    quoted_currency: string,
    underlying: string,
    destination_wallet: string,
    amount: number,
    cryptoAmount: number,
    amount_type: string,
    web3TransactionHandler: Web3TransactionHandler,
  ) {
    // Underlying is the asset for the quote eg. BTC
    // quoted_currencty is the fiat for the quote eg. USD

    // Ensure that the underlying and quoted_currency are supported by ZHLS
    const supportedUnderlyings = await this.getSupportedUnderlying();
    const supportedQuotedCurrency = await this.getSupportedQuotedCurrency();
    if (!supportedUnderlyings.includes(underlying)) {
      throw new BadRequestError({
        messageForClient:
          "Unsupported crypto code: " + underlying + ". We only support: " + supportedUnderlyings.join(", "),
      });
    }
    if (!supportedQuotedCurrency.includes(quoted_currency)) {
      throw new Error(`${quoted_currency} is not supported by ZHLS`);
    }

    // Check if the user is already registered with ZeroHash
    const participant = await this.getParticipant(consumer.email);
    let participant_code;

    // If the user is not registered, register them
    if (participant == null) {
      const new_participant = await this.createParticipant(consumer);
      if (new_participant == null) {
        console.log("Failed to create participant for email:" + consumer.email);
        throw new BadRequestError({ messageForClient: "Something went wrong. Contact noba support for resolution!" });
      }
      participant_code = new_participant["message"]["participant_code"];
      // participant_code = new_participant.participant_code;
    } else {
      participant_code = participant["message"]["participant_code"];
    }

    const quote = await this.requestQuote(underlying, quoted_currency, amount, amount_type);
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
    const amount_received = executed_quote["message"]["quote"].quantity;
    const trade_price = executed_quote["message"]["quote"].price;

    const assetTransfer = await this.transferAssets(
      "6MWNG6",
      "00SCXM",
      "6MWNG6",
      "6MWNG6",
      underlying,
      amount_received,
    );
    if (assetTransfer == null) {
      throw new BadRequestError({
        messageForClient: "Could not get a valid quote! Contact noba support for resolution!",
      });
    }

    //Set trade data for next function
    const tradeData = {
      symbol: underlying + "/" + quoted_currency,
      trade_price: trade_price,
      trade_quantity: String(amount / trade_price),
      product_type: "spot",
      trade_type: "regular",
      trade_reporter: consumer.email,
      platform_code: "6MWNG6",
      client_trade_id: "client_trade_id", // TODO: Check what exactly is client trade id and how is it used
      physical_delivery: true,
      parties_anonymous: false,
      transaction_timestamp: Date.now(),
      parties: [
        {
          participant_code: participant_code,
          asset: underlying,
          amount: String(amount),
          side: "buy",
          settling: true,
        },
        {
          participant_code: "6MWNG6",
          asset: quoted_currency,
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
          underlying,
          "6MWNG6",
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
            web3TransactionHandler.onTransactionHash(tx_hash ?? "tx_dummy_id");
          }
        }, 3000);
      }
    }, 3000);
  }
}
