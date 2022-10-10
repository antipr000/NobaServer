import { Inject, Injectable } from "@nestjs/common";
import sgMail from "@sendgrid/mail";
import { SendGridConfigs } from "../../config/configtypes/SendGridConfigs";
import { SENDGRID_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { CurrencyService } from "../common/currency.service";
import { Logger } from "winston";
import { EmailTemplates } from "./domain/EmailTemplates";
import { Utils } from "../../core/utils/Utils";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationEventType } from "./domain/NotificationTypes";
import { SendOtpEvent } from "./events/SendOtpEvent";
import { SendWalletUpdateVerificationCodeEvent } from "./events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent } from "./events/SendWelcomeMessageEvent";
import { SendKycApprovedUSEvent } from "./events/SendKycApprovedUSEvent";
import { SendKycApprovedNonUSEvent } from "./events/SendKycApprovedNonUSEvent";
import { SendKycDeniedEvent } from "./events/SendKycDeniedEvent";
import { SendKycPendingOrFlaggedEvent } from "./events/SendKycPendingOrFlaggedEvent";
import { SendDocumentVerificationPendingEvent } from "./events/SendDocumentVerificationPendingEvent";
import { SendDocumentVerificationRejectedEvent } from "./events/SendDocumentVerificationRejectedEvent";
import { SendDocumentVerificationTechnicalFailureEvent } from "./events/SendDocumentVerificationTechnicalFailureEvent";
import { SendCardAddedEvent } from "./events/SendCardAddedEvent";
import { SendCardAdditionFailedEvent } from "./events/SendCardAdditionFailedEvent";
import { SendCardDeletedEvent } from "./events/SendCardDeletedEvent";
import { SendTransactionInitiatedEvent } from "./events/SendTransactionInitiatedEvent";
import { SendCryptoFailedEvent } from "./events/SendCryptoFailedEvent";
import { SendOrderExecutedEvent } from "./events/SendOrderExecutedEvent";
import { SendOrderFailedEvent } from "./events/SendOrderFailedEvent";
import { SendHardDeclineEvent } from "./events/SendHardDeclineEvent";

const SUPPORT_URL = "help.noba.com";
const SENDER_EMAIL = "Noba <no-reply@noba.com>";
const NOBA_COMPLIANCE_EMAIL = "Noba Compliance <compliance@noba.com>";
@Injectable()
export class EmailService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(
    configService: CustomConfigService,
    @Inject(CurrencyService) private readonly currencyService: CurrencyService,
  ) {
    const sendGridApiKey = configService.get<SendGridConfigs>(SENDGRID_CONFIG_KEY).apiKey;
    sgMail.setApiKey(sendGridApiKey);
  }

  @OnEvent(`email.${NotificationEventType.SEND_OTP_EVENT}`)
  public async sendOtp(payload: SendOtpEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.OTP_EMAIL, //this is template id for sending otp without any context, see sendgrid dashboard
      dynamicTemplateData: {
        user: payload.name ?? "",
        user_email: payload.email,
        one_time_password: payload.otp,
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT}`)
  public async sendWalletUpdateVerificationCode(payload: SendWalletUpdateVerificationCodeEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WALLET_UPDATE_OTP,
      dynamicTemplateData: {
        user: payload.name ?? "",
        user_email: payload.email,
        one_time_password: payload.otp,
        wallet_address: payload.walletAddress,
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WELCOME_MESSAGE_EVENT}`)
  public async sendWelcomeMessage(payload: SendWelcomeMessageEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WELCOME_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_APPROVED_US_EVENT}`)
  public async sendKycApprovedUSEmail(payload: SendKycApprovedUSEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_US_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT}`)
  public async sendKycApprovedNonUSEmail(payload: SendKycApprovedNonUSEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_NON_US_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_DENIED_EVENT}`)
  public async sendKycDeniedEmail(payload: SendKycDeniedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_DENIED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        duration: 2, // TODO: Remove hardcoded duration
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT}`)
  public async sendKycPendingOrFlaggedEmail(payload: SendKycPendingOrFlaggedEvent) {
    const minutesFromNow = 10; // TODO: Remove hardcoded minutes
    const futureDate = new Date(new Date().getTime() + minutesFromNow * 60000).toUTCString();

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_FLAGGED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        datetimestamp: futureDate,
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT}`)
  public async sendDocVerificationPendingEmail(payload: SendDocumentVerificationPendingEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_PENDING_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT}`)
  public async sendDocVerificationRejectedEmail(payload: SendDocumentVerificationRejectedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_REJECTED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT}`)
  public async sendDocVerificationFailedTechEmail(payload: SendDocumentVerificationTechnicalFailureEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_FAILED_TECH_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_CARD_ADDED_EVENT}`)
  public async sendCardAddedEmail(payload: SendCardAddedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        card_network: payload.cardNetwork,
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT}`)
  public async sendCardAdditionFailedEmail(payload: SendCardAdditionFailedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDITION_FAILED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_CARD_DELETED_EVENT}`)
  public async sendCardDeletedEmail(payload: SendCardDeletedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_DELETED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        card_network: payload.cardNetwork,
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_TRANSACTION_INITIATED_EVENT}`)
  public async sendTransactionInitiatedEmail(payload: SendTransactionInitiatedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFee) -
      Utils.roundTo2DecimalNumber(payload.params.networkFee) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFee);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.TRANSACTION_INITIATED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        transaction_id: payload.params.transactionID,
        user_email: payload.email,
        user_id: payload.email,
        fiat_currency_code: payload.params.currencyCode,
        card_network: payload.params.paymentMethod,
        last_four: payload.params.last4Digits,
        order_date: payload.params.transactionTimestamp.toLocaleString(),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        conversion_rate: payload.params.conversionRate,
        processing_fees: Utils.roundTo2DecimalString(payload.params.processingFee),
        network_fees: Utils.roundTo2DecimalString(payload.params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(payload.params.nobaFee),
        total_price: Utils.roundTo2DecimalString(payload.params.totalPrice),
        cryptocurrency_code: payload.params.cryptoCurrency,
        cryptocurrency: await this.getCryptocurrencyNameFromTicker(payload.params.cryptoCurrency),
        crypto_expected: payload.params.cryptoAmount,
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_CRYPTO_FAILED_EVENT}`)
  public async sendCryptoFailedEmail(payload: SendCryptoFailedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFee) -
      Utils.roundTo2DecimalNumber(payload.params.networkFee) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFee);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CRYPTO_FAILED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        transaction_id: payload.params.transactionID,
        user_email: payload.email,
        user_id: payload.email,
        fiat_currency_code: payload.params.currencyCode,
        card_network: payload.params.paymentMethod,
        last_four: payload.params.last4Digits,
        order_date: payload.params.transactionTimestamp.toLocaleString(),
        cryptocurrency_code: payload.params.cryptoCurrency,
        conversion_rate: payload.params.conversionRate,
        crypto_expected: payload.params.cryptoAmount,
        subtotal: Utils.roundTo2DecimalString(subtotal),
        processing_fees: Utils.roundTo2DecimalString(payload.params.processingFee),
        network_fees: Utils.roundTo2DecimalString(payload.params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(payload.params.nobaFee),
        total_price: Utils.roundTo2DecimalString(payload.params.totalPrice),
        reason_failed: payload.params.failureReason,
        cryptocurrency: await this.getCryptocurrencyNameFromTicker(payload.params.cryptoCurrency),
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_ORDER_EXECUTED_EVENT}`)
  public async sendOrderExecutedEmail(payload: SendOrderExecutedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFee) -
      Utils.roundTo2DecimalNumber(payload.params.networkFee) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFee);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ORDER_EXECUTED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        transaction_id: payload.params.transactionID,
        user_email: payload.email,
        user_id: payload.email,
        transaction_hash: payload.params.transactionHash,
        fiat_currency_code: payload.params.currencyCode,
        card_network: payload.params.paymentMethod,
        last_four: payload.params.last4Digits,
        order_date: payload.params.transactionTimestamp.toLocaleString(),
        settled_timestamp: payload.params.settledTimestamp.toLocaleString(),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        conversion_rate: payload.params.conversionRate,
        processing_fees: Utils.roundTo2DecimalString(payload.params.processingFee),
        network_fees: Utils.roundTo2DecimalString(payload.params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(payload.params.nobaFee),
        total_price: Utils.roundTo2DecimalString(payload.params.totalPrice),
        cryptocurrency_code: payload.params.cryptoCurrency,
        cryptocurrency: await this.getCryptocurrencyNameFromTicker(payload.params.cryptoCurrency),
        crypto_received: payload.params.cryptoAmount,
        crypto_expected: payload.params.cryptoAmountExpected,
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_ORDER_FAILED_EVENT}`)
  public async sendOrderFailedEmail(payload: SendOrderFailedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFee) -
      Utils.roundTo2DecimalNumber(payload.params.networkFee) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFee);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ORDER_FAILED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        transaction_id: payload.params.transactionID,
        user_id: payload.email,
        user_email: payload.email,
        fiat_currency_code: payload.params.currencyCode,
        card_network: payload.params.paymentMethod,
        last_four: payload.params.last4Digits,
        order_date: payload.params.transactionTimestamp.toLocaleString(),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        conversion_rate: payload.params.conversionRate,
        processing_fees: Utils.roundTo2DecimalString(payload.params.processingFee),
        network_fees: Utils.roundTo2DecimalString(payload.params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(payload.params.nobaFee),
        total_price: Utils.roundTo2DecimalString(payload.params.totalPrice),
        cryptocurrency_code: payload.params.cryptoCurrency,
        cryptocurrency: await this.getCryptocurrencyNameFromTicker(payload.params.cryptoCurrency),
        crypto_expected: payload.params.cryptoAmount,
        reason_declined: payload.params.failureReason,
      },
    };

    await sgMail.send(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_HARD_DECLINE_EVENT}`)
  public async sendHardDeclineEmail(payload: SendHardDeclineEvent) {
    const msg = {
      to: NOBA_COMPLIANCE_EMAIL,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.NOBA_INTERNAL_HARD_DECLINE,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        session_id: payload.sessionID,
        transaction_id: payload.transactionID,
        payment_token: payload.paymentToken,
        processor: payload.processor,
        timestamp: new Date().toLocaleString(),
        response_code: payload.responseCode,
        summary: payload.responseSummary,
      },
    };

    await sgMail.send(msg);
  }

  private async getCryptocurrencyNameFromTicker(ticker: string): Promise<string> {
    const cryptoCurrency = await this.currencyService.getCryptocurrency(ticker);
    // Quite unlikely this would happen
    if (cryptoCurrency === null || cryptoCurrency === undefined) {
      this.logger.error(`Unable to find cryptocurrency entry for ticker ${ticker}`);
      return ticker;
    }
    return cryptoCurrency.name;
  }
}
