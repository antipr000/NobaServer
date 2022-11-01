import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import Checkout from "checkout-sdk-node";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CheckoutConfigs } from "../../config/configtypes/CheckoutConfigs";
import { CHECKOUT_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { CheckoutPaymentStatus } from "./domain/CheckoutTypes";
import { AddPaymentMethodDTO, PaymentType } from "../consumer/dto/AddPaymentMethodDTO";
import { PspAddPaymentMethodResponse } from "./domain/PspAddPaymentMethodResponse";
import { PspACHPaymentResponse, PspCardPaymentResponse } from "./domain/PspPaymentResponse";

@Injectable()
export class CheckoutService {
  private readonly checkoutApi: Checkout;
  private readonly checkoutConfigs: CheckoutConfigs;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(private configService: CustomConfigService) {
    this.checkoutConfigs = configService.get<CheckoutConfigs>(CHECKOUT_CONFIG_KEY);
    this.checkoutApi = new Checkout(this.checkoutConfigs.secretKey, {
      pk: this.checkoutConfigs.publicKey,
    });
  }

  public async createConsumer(email: string): Promise<string> {
    try {
      const checkoutCustomer = await this.checkoutApi.customers.create({
        email: email,
        metadata: {
          coupon_code: this.configService.get<CheckoutConfigs>(CHECKOUT_CONFIG_KEY).couponCode,
          partner_id: this.configService.get<CheckoutConfigs>(CHECKOUT_CONFIG_KEY).partnerId,
        },
      });

      return checkoutCustomer["id"];
    } catch (e) {
      if (e.body["error_codes"].filter(errorCode => errorCode === "customer_email_already_exists").length > 0) {
        // existing customer
        const checkoutCustomer = await this.checkoutApi.customers.get(email);
        return checkoutCustomer["id"];
      } else {
        throw new BadRequestException("Failed to create checkout customer");
      }
    }
  }

  public async addCreditCardPaymentMethod(
    paymentMethod: AddPaymentMethodDTO,
    checkoutCustomerID: string,
  ): Promise<PspAddPaymentMethodResponse> {
    if (paymentMethod.type !== PaymentType.CARD) {
      throw new BadRequestException(`Payment type ${paymentMethod.type} is not supported for addCreditCard`);
    }
    try {
      // To add payment method, we first need to tokenize the card
      // Token is only valid for 15 mins
      const token = await this.checkoutApi.tokens.request({
        type: "card",
        number: paymentMethod.cardDetails.cardNumber,
        expiry_month: paymentMethod.cardDetails.expiryMonth,
        expiry_year: paymentMethod.cardDetails.expiryYear,
        cvv: paymentMethod.cardDetails.cvv,
      });

      // Now create instrument
      const instrument = await this.checkoutApi.instruments.create({
        // infered type "token",
        token: token["token"], // Generated by Checkout.Frames
        customer: {
          id: checkoutCustomerID,
        },
      });
      console.log(instrument);
      return {
        instrumentID: instrument["id"],
        scheme: instrument["scheme"],
        bin: instrument["bin"],
        issuer: instrument["issuer"] ?? "",
        cardType: instrument["card_type"],
      };
    } catch (err) {
      this.logger.error(`Failed to add card card: ${err}`);
      throw new BadRequestException({ message: "Failed to add card" });
    }
  }

  public async getPaymentMethod(paymentMethodID: string): Promise<PspAddPaymentMethodResponse> {
    const paymentMethodResponse = await this.checkoutApi.instruments.get(paymentMethodID);

    return {
      instrumentID: paymentMethodID,
      scheme: paymentMethodResponse["scheme"],
      bin: paymentMethodResponse["bin"],
      issuer: paymentMethodResponse["issuer"] ?? "",
      cardType: paymentMethodResponse["card_type"],
    };
  }

  public async makeACHPayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    transactionId: string,
    isOneDollarTransaction: boolean,
  ): Promise<PspACHPaymentResponse> {
    try {
      const checkoutResponse = await this.checkoutApi.payments.request(
        {
          amount: amount,
          currency: currency,
          source: {
            type: "provider_token",
            payment_method: "ach",
            token: paymentMethodId,
            account_holder: {
              type: "individual",
            },
          },
          description: "Noba Customer Payment at UTC " + Date.now(),
          processing_channel_id: isOneDollarTransaction /* TODO: Remove this if not needed */
            ? "pc_ka6ij3qluenufp5eovqqtw4xdu"
            : this.checkoutConfigs.processingChannelId,
          metadata: {
            order_id: transactionId,
          },
        },
        /*idempotencyKey=*/ transactionId,
      );

      this.logger.info(`Response from Checkout: ${JSON.stringify(checkoutResponse, null, 1)}`);

      const status = checkoutResponse["status"];

      return {
        id: checkoutResponse["id"],
        status: status,
        response_code: checkoutResponse["responseCode"],
      };
    } catch (e) {
      this.logger.error(
        `Exception while requesting checkout payment for transaction id ${transactionId}: ${e.message}`,
      );
      throw e;
    }
  }

  public async makeCardPayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    transactionId: string,
  ): Promise<PspCardPaymentResponse> {
    try {
      const checkoutResponse = await this.checkoutApi.payments.request(
        {
          amount: amount,
          currency: currency,
          source: {
            type: "id",
            id: paymentMethodId,
          },
          description: "Noba Customer Payment at UTC " + Date.now(),
          metadata: {
            order_id: transactionId,
          },
        },
        /*idempotencyKey=*/ transactionId,
      );
      return {
        id: checkoutResponse["id"],
        response_code: checkoutResponse["response_code"],
        response_summary: checkoutResponse["response_summary"],
        risk: {
          flagged: checkoutResponse["risk"]["flagged"],
        },
        bin: checkoutResponse["source"]["bin"],
      };
    } catch (err) {
      this.logger.error(
        `Exception while requesting checkout payment for transaction id ${transactionId}: ${err.message}`,
      );
      throw err;
    }
  }

  public async getPaymentDetails(paymentId: string): Promise<CheckoutPaymentStatus> {
    try {
      const payment = await this.checkoutApi.payments.get(paymentId);
      const status: CheckoutPaymentStatus = payment.status;
      return status;
    } catch (err) {
      throw new Error("Error while checking payment status from payment id " + paymentId + " " + err);
    }
  }

  public async removePaymentMethod(paymentMethodId: string): Promise<void> {
    await this.checkoutApi.instruments.delete(paymentMethodId);
  }
}
