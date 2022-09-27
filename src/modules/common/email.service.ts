import { Inject, Injectable } from "@nestjs/common";
import sgMail from "@sendgrid/mail";
import { SendGridConfigs } from "../../config/configtypes/SendGridConfigs";
import { SENDGRID_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { CurrencyService } from "../../modules/common/currency.service";
import {
  CryptoFailedEmailParameters,
  OrderExecutedEmailParameters,
  OrderFailedEmailParameters,
  TransactionInitiatedEmailParameters,
} from "./domain/EmailParameters";
import { EmailTemplates } from "./domain/EmailTemplates";
import { Utils } from "../../core/utils/Utils";

const SUPPORT_URL = "help.noba.com";
const SENDER_EMAIL = "Noba <no-reply@noba.com>";
const NOBA_COMPLIANCE_EMAIL = "Noba Compliance <compliance@noba.com>";
@Injectable()
export class EmailService {
  constructor(
    configService: CustomConfigService,
    @Inject(CurrencyService) private readonly currencyService: CurrencyService,
  ) {
    const sendGridApiKey = configService.get<SendGridConfigs>(SENDGRID_CONFIG_KEY).apiKey;
    sgMail.setApiKey(sendGridApiKey);
  }

  public async sendOtp(email: string, otp: string, name?: string) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.OTP_EMAIL, //this is template id for sending otp without any context, see sendgrid dashboard
      dynamicTemplateData: {
        user: name ?? "",
        user_email: email,
        one_time_password: otp,
      },
    };

    await sgMail.send(msg);
  }

  public async sendWalletUpdateVerificationCode(email: string, otp: string, walletAddress: string, name?: string) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WALLET_UPDATE_OTP,
      dynamicTemplateData: {
        user: name ?? "",
        user_email: email,
        one_time_password: otp,
        wallet_address: walletAddress,
      },
    };

    await sgMail.send(msg);
  }

  public async sendWelcomeMessage(email: string, firstName?: string, lastName?: string) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WELCOME_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
      },
    };

    await sgMail.send(msg);
  }

  public async sendKycApprovedUSEmail(firstName: string, lastName: string, email: string) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_US_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
      },
    };

    await sgMail.send(msg);
  }

  public async sendKycApprovedNonUSEmail(firstName: string, lastName: string, email: string) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_NON_US_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
      },
    };

    await sgMail.send(msg);
  }

  public async sendKycDeniedEmail(firstName: string, lastName: string, email: string) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_DENIED_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
        duration: 2, // TODO: Remove hardcoded duration
      },
    };

    await sgMail.send(msg);
  }

  public async sendKycPendingOrFlaggedEmail(firstName: string, lastName: string, email: string) {
    const minutesFromNow = 10; // TODO: Remove hardcoded minutes
    const futureDate = new Date(new Date().getTime() + minutesFromNow * 60000).toUTCString();

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_FLAGGED_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
        datetimestamp: futureDate,
      },
    };

    await sgMail.send(msg);
  }

  public async sendDocVerificationPendingEmail(firstName: string, lastName: string, email: string) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_PENDING_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
      },
    };

    await sgMail.send(msg);
  }

  public async sendDocVerificationRejectedEmail(firstName: string, lastName: string, email: string) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_REJECTED_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
      },
    };

    await sgMail.send(msg);
  }

  public async sendDocVerificationFailedTechEmail(firstName: string, lastName: string, email: string) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_FAILED_TECH_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
      },
    };

    await sgMail.send(msg);
  }

  public async sendCardAddedEmail(
    firstName: string,
    lastName: string,
    email: string,
    cardNetwork: string,
    last4Digits: string,
  ) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDED_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
        card_network: cardNetwork,
        last_four: last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }

  public async sendCardAdditionFailedEmail(firstName: string, lastName: string, email: string, last4Digits: string) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDITION_FAILED_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
        last_four: last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }

  public async sendCardDeletedEmail(
    firstName: string,
    lastName: string,
    email: string,
    cardNetwork: string,
    last4Digits: string,
  ) {
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_DELETED_EMAIL,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
        card_network: cardNetwork,
        last_four: last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }

  public async sendTransactionInitiatedEmail(
    firstName: string,
    lastName: string,
    email: string,
    params: TransactionInitiatedEmailParameters,
  ) {
    const subtotal =
      Utils.roundTo2DecimalNumber(params.totalPrice) -
      Utils.roundTo2DecimalNumber(params.processingFee) -
      Utils.roundTo2DecimalNumber(params.networkFee) -
      Utils.roundTo2DecimalNumber(params.nobaFee);

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.TRANSACTION_INITIATED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(firstName, lastName),
        transaction_id: params.transactionID,
        user_email: email,
        user_id: email,
        fiat_currency_code: params.currencyCode,
        card_network: params.paymentMethod,
        last_four: params.last4Digits,
        order_date: params.transactionTimestamp.toLocaleString(),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        conversion_rate: params.conversionRate,
        processing_fees: Utils.roundTo2DecimalString(params.processingFee),
        network_fees: Utils.roundTo2DecimalString(params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(params.nobaFee),
        total_price: Utils.roundTo2DecimalString(params.totalPrice),
        cryptocurrency_code: params.cryptoCurrency,
        cryptocurrency: await this.getCryptocurrencyNameFromTicker(params.cryptoCurrency),
        crypto_expected: params.cryptoAmount,
      },
    };

    await sgMail.send(msg);
  }

  public async sendCryptoFailedEmail(
    firstName: string,
    lastName: string,
    email: string,
    params: CryptoFailedEmailParameters,
  ) {
    const subtotal =
      Utils.roundTo2DecimalNumber(params.totalPrice) -
      Utils.roundTo2DecimalNumber(params.processingFee) -
      Utils.roundTo2DecimalNumber(params.networkFee) -
      Utils.roundTo2DecimalNumber(params.nobaFee);

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CRYPTO_FAILED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(firstName, lastName),
        transaction_id: params.transactionID,
        user_email: email,
        user_id: email,
        fiat_currency_code: params.currencyCode,
        card_network: params.paymentMethod,
        last_four: params.last4Digits,
        order_date: params.transactionTimestamp.toLocaleString(),
        cryptocurrency_code: params.cryptoCurrency,
        conversion_rate: params.conversionRate,
        crypto_expected: params.cryptoAmount,
        subtotal: Utils.roundTo2DecimalString(subtotal),
        processing_fees: Utils.roundTo2DecimalString(params.processingFee),
        network_fees: Utils.roundTo2DecimalString(params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(params.nobaFee),
        total_price: Utils.roundTo2DecimalString(params.totalPrice),
        reason_failed: params.failureReason,
        cryptocurrency: await this.getCryptocurrencyNameFromTicker(params.cryptoCurrency),
      },
    };

    await sgMail.send(msg);
  }

  public async sendOrderExecutedEmail(
    firstName: string,
    lastName: string,
    email: string,
    params: OrderExecutedEmailParameters,
  ) {
    const subtotal =
      Utils.roundTo2DecimalNumber(params.totalPrice) -
      Utils.roundTo2DecimalNumber(params.processingFee) -
      Utils.roundTo2DecimalNumber(params.networkFee) -
      Utils.roundTo2DecimalNumber(params.nobaFee);

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ORDER_EXECUTED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(firstName, lastName),
        transaction_id: params.transactionID,
        user_email: email,
        user_id: email,
        transaction_hash: params.transactionHash,
        fiat_currency_code: params.currencyCode,
        card_network: params.paymentMethod,
        last_four: params.last4Digits,
        order_date: params.transactionTimestamp.toLocaleString(),
        settled_timestamp: params.settledTimestamp.toLocaleString(),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        conversion_rate: params.conversionRate,
        processing_fees: Utils.roundTo2DecimalString(params.processingFee),
        network_fees: Utils.roundTo2DecimalString(params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(params.nobaFee),
        total_price: Utils.roundTo2DecimalString(params.totalPrice),
        cryptocurrency_code: params.cryptoCurrency,
        cryptocurrency: await this.getCryptocurrencyNameFromTicker(params.cryptoCurrency),
        crypto_received: params.cryptoAmount,
        crypto_expected: params.cryptoAmountExpected,
      },
    };

    await sgMail.send(msg);
  }

  public async sendOrderFailedEmail(
    firstName: string,
    lastName: string,
    email: string,
    params: OrderFailedEmailParameters,
  ) {
    const subtotal =
      Utils.roundTo2DecimalNumber(params.totalPrice) -
      Utils.roundTo2DecimalNumber(params.processingFee) -
      Utils.roundTo2DecimalNumber(params.networkFee) -
      Utils.roundTo2DecimalNumber(params.nobaFee);

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ORDER_FAILED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(firstName, lastName),
        transaction_id: params.transactionID,
        user_id: email,
        user_email: email,
        fiat_currency_code: params.currencyCode,
        card_network: params.paymentMethod,
        last_four: params.last4Digits,
        order_date: params.transactionTimestamp.toLocaleString(),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        conversion_rate: params.conversionRate,
        processing_fees: Utils.roundTo2DecimalString(params.processingFee),
        network_fees: Utils.roundTo2DecimalString(params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(params.nobaFee),
        total_price: Utils.roundTo2DecimalString(params.totalPrice),
        cryptocurrency_code: params.cryptoCurrency,
        cryptocurrency: await this.getCryptocurrencyNameFromTicker(params.cryptoCurrency),
        crypto_expected: params.cryptoAmount,
        reason_declined: params.failureReason,
      },
    };

    await sgMail.send(msg);
  }

  public async sendHardDeclineEmail(
    firstName: string,
    lastName: string,
    email: string,
    sessionID: string,
    transactionID: string,
    paymentToken: string,
    processor: string,
    responseCode: string,
    responseSummary: string,
  ) {
    const msg = {
      to: NOBA_COMPLIANCE_EMAIL,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.NOBA_INTERNAL_HARD_DECLINE,
      dynamicTemplateData: {
        user_email: email,
        username: Utils.getUsernameFromNameParts(firstName, lastName),
        session_id: sessionID,
        transaction_id: transactionID,
        payment_token: paymentToken,
        processor: processor,
        timestamp: new Date().toLocaleString(),
        response_code: responseCode,
        summary: responseSummary,
      },
    };

    await sgMail.send(msg);
  }

  private async getCryptocurrencyNameFromTicker(ticker: string): Promise<string> {
    const cryptoCurrencies = await this.currencyService.getSupportedCryptocurrencies();
    return cryptoCurrencies.find(curr => curr.ticker === ticker).name;
  }
}
