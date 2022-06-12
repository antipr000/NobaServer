import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { StripeConfigs } from "../../config/configtypes/StripeConfigs";
import { STRIPE_CONFIG_KEY } from "../../config/ConfigurationUtils";

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(configService: ConfigService) {
    this.stripe = new Stripe(configService.get<StripeConfigs>(STRIPE_CONFIG_KEY).secretKey, {
      apiVersion: "2020-08-27",
    });
  }

  public get stripeApi() {
    return this.stripe;
  }
}
