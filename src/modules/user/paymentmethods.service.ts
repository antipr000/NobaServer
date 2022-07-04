import { Inject, Injectable } from "@nestjs/common";
import Checkout from "checkout-sdk-node";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import Stripe from "stripe";
import { Logger } from "winston";
import { DBProvider } from "../../infraproviders/DBProvider";
import { CheckoutService } from "../common/checkout.service";
import { StripeService } from "../common/stripe.service";
import { User } from "./domain/User";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import { PaymentMethodDTO } from "./dto/PaymentMethodDTO";
import {
  convertCheckoutPaymentMethodToPaymentMethodDTO,
  convertStripePaymentMethodToPaymentMethodDTO,
} from "./mappers/PaymentMethodMappers";
import { UserMapper } from "./mappers/UserMapper";
import { MongoDBUserRepo } from "./repos/MongoDBUserRepo";
import { IUserRepo } from "./repos/UserRepo";

// TODO: We can add a factory class for different payment providers and the routing logic can live there post MVP

@Injectable()
export class StripePaymentMethodsService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly userRepo: IUserRepo;
  private readonly userMapper: UserMapper;

  private readonly stripeApi: Stripe;

  constructor(dbProvider: DBProvider, stripeService: StripeService) {
    this.stripeApi = stripeService.stripeApi;

    this.userRepo = new MongoDBUserRepo(dbProvider);
    this.userMapper = new UserMapper();
  }

  async getPaymentMethods(userID: string): Promise<PaymentMethodDTO[]> {
    const user = await this.userRepo.getUser(userID);
    const stripeCustomerID = user.props.stripeCustomerID;

    //TODO expand for other payment methods when needed
    const stripePaymentMethods = await this.stripeApi.paymentMethods.list({
      customer: stripeCustomerID,
      type: "card",
    });

    // console.log(stripePaymentMethods);
    return (stripePaymentMethods.data ?? []).map(stripePaymentMethod =>
      convertStripePaymentMethodToPaymentMethodDTO(stripePaymentMethod),
    );
  }

  async addPaymentMethod(userID: string, paymentMethod: AddPaymentMethodDTO): Promise<PaymentMethodDTO> {
    const user = await this.userRepo.getUser(userID);
    const stripeCustomerID = user.props.stripeCustomerID;

    //TODO expand for other payment methods when needed
    const params: Stripe.PaymentMethodCreateParams = {
      type: "card",
      card: {
        number: paymentMethod.cardNumber,
        exp_month: paymentMethod.cardExpiryMonth,
        exp_year: paymentMethod.cardExpiryYear,
        cvc: paymentMethod.cardCVV,
      },
    };

    //first create payment method and then attach it to customer
    const stripePaymentMethod = await this.stripeApi.paymentMethods.create(params);
    //attach the payment method to the customer
    await this.stripeApi.paymentMethods.attach(stripePaymentMethod.id, { customer: stripeCustomerID });

    return convertStripePaymentMethodToPaymentMethodDTO(stripePaymentMethod);
  }

  async removePaymentMethod(paymentMethodID: string): Promise<void> {
    //weird that attach api takes the payment method id and customer id but detach api does not!
    await this.stripeApi.paymentMethods.detach(paymentMethodID);
  }
}

@Injectable()
export class CheckoutPaymentMethodsService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly userRepo: IUserRepo;
  private readonly userMapper: UserMapper;

  private readonly checkoutApi: Checkout;

  constructor(dbProvider: DBProvider, checkoutService: CheckoutService) {
    // TODO: these are sandbox creds so fine to keep them here for now, but refactor these to load from Amazon secrets manager
    this.checkoutApi = checkoutService.checkoutApi;

    this.userRepo = new MongoDBUserRepo(dbProvider);
    this.userMapper = new UserMapper();
  }

  async getPaymentMethods(userID: string): Promise<PaymentMethodDTO[]> {
    const user = await this.userRepo.getUser(userID);
    const checkoutCustomerID = user.props.checkoutCustomerID;
    let checkoutPaymentMethods;
    if (checkoutCustomerID) {
      // Get checkout payment methods
      const customerData = await this.checkoutApi.customers.get(checkoutCustomerID);

      // payment methods are called instrments in checkout terminology
      checkoutPaymentMethods = customerData["instruments"];
    }

    // todo add another mapping logic on how do we convert payment method to DTO generically for several payment providers from code organization perspective later
    return (checkoutPaymentMethods ?? []).map(checkoutPaymentMethod =>
      convertCheckoutPaymentMethodToPaymentMethodDTO(checkoutPaymentMethod),
    );
  }

  async createCustomer(user: User): Promise<string> {
    // Create customer on Checkout
    const customer = await this.checkoutApi.customers.create({
      email: user.props.email,
      name: user.props.name,
      phone: {
        country_code: "+1", // TODO: Add this in user object?
        number: user.props.phone,
      },
      metadata: {
        coupon_code: "NY2018",
        partner_id: 123989,
      },
    });
    const checkoutCustomerID = customer["id"];

    // Now update this ID in the User Repo in Noba database
    const userProps = user.props;
    userProps["checkoutCustomerID"] = checkoutCustomerID;
    const updatedUser = User.createUser(userProps);
    await this.userRepo.updateUser(updatedUser);

    return checkoutCustomerID;
  }

  async addPaymentMethod(userID: string, paymentMethod: AddPaymentMethodDTO): Promise<PaymentMethodDTO> {
    const user = await this.userRepo.getUser(userID);
    const checkoutCustomerID = user.props.checkoutCustomerID ?? (await this.createCustomer(user));

    console.log(checkoutCustomerID);

    const token = await this.checkoutApi.tokens.request({
      type: "card",
      number: paymentMethod.cardNumber,
      expiry_month: paymentMethod.cardExpiryMonth,
      expiry_year: paymentMethod.cardExpiryYear,
      cvv: paymentMethod.cardCVV,
    });

    console.log(token);

    // Now create instrument
    const instrument = await this.checkoutApi.instruments.create({
      // infered type "token",
      token: token["token"], // Generated by Checkout.Frames
      customer: {
        id: checkoutCustomerID,
      },
    });

    console.log(instrument);

    return convertCheckoutPaymentMethodToPaymentMethodDTO(instrument);
  }

  async requestPayment(paymentMethodID: string, amount: number, currency: string): Promise<any> {
    try {
      const payment = await this.checkoutApi.payments.request({
        amount: amount * 100, // this is amount in cents so if we write 1 here it means 0.01 USD
        currency: currency,
        source: {
          type: "id",
          id: paymentMethodID,
        },
        description: "Noba Customer Payment at UTC " + Date.now(),
        metadata: {
          order_id: "test_order_1",
        },
      });
      return payment;
    } catch (err) {
      throw Error("Payment processing failed");
    }
  }

  async removePaymentMethod(paymentMethodID: string): Promise<void> {
    // TODO: This gives 401 Unauthorized for some reason, confirm with CKO team on this
    await this.checkoutApi.instruments.delete(paymentMethodID);
  }
}
