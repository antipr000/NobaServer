import { Injectable } from "@nestjs/common";
import { SendGridConfigs } from "../../config/configtypes/SendGridConfigs";
import { SENDGRID_CONFIG_KEY } from "../../config/ConfigurationUtils";
import * as sgMail from "@sendgrid/mail";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { TransactionEmailParameters } from "./domain/TransactionEmailParameters";
import { EmailTemplates } from "./domain/EmailTemplates";

const SUPPORT_URL = "help.noba.com";
const SENDER_EMAIL = "Noba <no-reply@noba.com>";
@Injectable()
export class EmailService {
  constructor(configService: CustomConfigService) {
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
        one_time_password: otp,
      },
    };

    await sgMail.send(msg);
  }

  public async sendWelcomeMessage(email: string, firstName?: string, lastName?: string) {
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`;
    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WELCOME_MESSAGE,
      dynamicTemplateData: {
        username: fullName ?? "",
      },
    };

    await sgMail.send(msg);
  }

  public async sendKycApprovedEmail(firstName: string, lastName: string, email: string) {
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`;

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_APPROVED_EMAIL,
      dynamicTemplateData: {
        username: fullName ?? "",
      },
    };

    await sgMail.send(msg);
  }

  public async sendKycDeniedEmail(firstName: string, lastName: string, email: string) {
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`;

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_DENIED_EMAIL,
      dynamicTemplateData: {
        username: fullName ?? "",
        duration: 2, // TODO: Remove hardcoded duration
      },
    };

    await sgMail.send(msg);
  }

  public async sendKycPendingOrFlaggedEmail(firstName: string, lastName: string, email: string) {
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`;
    const minutesFromNow = 10; // TODO: Remove hardcoded minutes
    const futureDate = new Date(new Date().getTime() + minutesFromNow * 60000).toUTCString();

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_FLAGGED_EMAIL,
      dynamicTemplateData: {
        username: fullName ?? "",
        datetimestamp: futureDate,
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
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`;

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDED_EMAIL,
      dynamicTemplateData: {
        username: fullName ?? "",
        card_network: cardNetwork,
        last_4_digits_of_card: last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }

  public async sendCardAdditionFailedEmail(
    firstName: string,
    lastName: string,
    email: string,
    cardNetwork: string,
    last4Digits: string,
  ) {
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`;

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDITION_FAILED_EMAIL,
      dynamicTemplateData: {
        username: fullName ?? "",
        card_network: cardNetwork,
        last_4_digits_of_card: last4Digits,
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
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`;

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_DELETED_EMAIL,
      dynamicTemplateData: {
        username: fullName ?? "",
        card_network: cardNetwork,
        last_4_digits_of_card: last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }

  public async sendTransactionInitiatedEmail(
    firstName: string,
    lastName: string,
    email: string,
    transactionEmailParameters: TransactionEmailParameters,
  ) {
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`;

    const msg = {
      to: email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.TRANSACTION_INITIATED_EMAIL,
      dynamicTemplateData: {
        username: fullName ?? "",
        transaction_id: transactionEmailParameters.transactionID,
        payment_method: transactionEmailParameters.paymentMethod,
        last_4_digits_of_card: transactionEmailParameters.last4Digits,
        order_date: transactionEmailParameters.createdDate,
        currency_code: transactionEmailParameters.currencyCode,
        subtotal: transactionEmailParameters.subtotalPrice,
        processing_fees: transactionEmailParameters.processingFee,
        network_fees: transactionEmailParameters.networkFee,
        noba_fee: transactionEmailParameters.nobaFee,
        total: transactionEmailParameters.totalPrice,
        crypto_currency_code: transactionEmailParameters.cryptoCurrency,
        crypto_currency: transactionEmailParameters.cryptoAmount,
        expected_crypto: transactionEmailParameters.cryptoAmount,
        fiat_amount: transactionEmailParameters.totalPrice,
      },
    };

    await sgMail.send(msg);
  }
}
