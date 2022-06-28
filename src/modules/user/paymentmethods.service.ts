import { Inject, Injectable } from "@nestjs/common";
import Checkout from "checkout-sdk-node";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import Stripe from "stripe";
import { Logger } from "winston";
import { DBProvider } from "../../infraproviders/DBProvider";
import { StripeService } from "../common/stripe.service";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import { PaymentMethodDTO } from "./dto/PaymentMethodDTO";
import {
  convertCheckoutPaymentMethodToPaymentMethodDTO,
  convertStripePaymentMethodToPaymentMethodDTO,
} from "./mappers/PaymentMethodMappers";
import { UserMapper } from "./mappers/UserMapper";
import { MongoDBUserRepo } from "./repos/MongoDBUserRepo";
import { IUserRepo } from "./repos/UserRepo";

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

  private readonly cko: Checkout;

  constructor(dbProvider: DBProvider, stripeService: StripeService) {
    // TODO: these are sandbox creds so fine to keep them here for now, but refactor these to load from Amazon secrets manager
    this.cko = new Checkout("sk_sbox_xdhkcai4bosm32intni46my5x4j", {
      pk: "pk_sbox_m3756a5g3z4ootpdssqy3hxxemv",
    });

    this.userRepo = new MongoDBUserRepo(dbProvider);
    this.userMapper = new UserMapper();
  }

  async getPaymentMethods(userID: string): Promise<PaymentMethodDTO[]> {
    const user = await this.userRepo.getUser(userID);
    const checkoutCustomerID = user.props.checkoutCustomerID;

    // Get checkout payment methods
    const customerData = await this.cko.customers.get(checkoutCustomerID);

    // payment methods are called instrments in checkout terminology
    const checkoutPaymentMethods = customerData["instruments"];

    // todo add another mapping logic on how do we convert payment method to DTO generically for several payment providers from code organization perspective later
    return (checkoutPaymentMethods ?? []).map(checkoutPaymentMethod =>
      convertCheckoutPaymentMethodToPaymentMethodDTO(checkoutPaymentMethod),
    );
  }

  async addPaymentMethod(userID: string, paymentMethod: AddPaymentMethodDTO): Promise<PaymentMethodDTO> {
    const user = await this.userRepo.getUser(userID);
    // TODO ask ankit where are we populating customer id?
    const checkoutCustomerID = user.props.checkoutCustomerID;

    // To add payment method, we first need to tokenize the card
    // Token is only valid for 15 mins
    const token = await this.cko.tokens.request({
      type: "card",
      number: paymentMethod.cardNumber,
      expiry_month: paymentMethod.cardExpiryMonth,
      expiry_year: paymentMethod.cardExpiryYear,
      cvv: paymentMethod.cardCVV,
    });

    // Now create instrument
    const instrument = await this.cko.instruments.create({
      // infered type "token",
      token: token, // Generated by Checkout.Frames
      customer: {
        id: checkoutCustomerID,
      },
    });

    return convertCheckoutPaymentMethodToPaymentMethodDTO(instrument);
  }

  async removePaymentMethod(paymentMethodID: string): Promise<void> {
    //weird that attach api takes the payment method id and customer id but detach api does not!
    // await this.stripeApi.paymentMethods.detach(paymentMethodID);
  }
}
