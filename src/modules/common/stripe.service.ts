import { Injectable } from "@nestjs/common";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import Stripe from "stripe";
import { StripeConfigs } from "../../config/configtypes/StripeConfigs";
import { STRIPE_CONFIG_KEY } from "../../config/ConfigurationUtils";

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(private configService: CustomConfigService) {
    const stripeSecretKey = this.configService.get<StripeConfigs>(STRIPE_CONFIG_KEY).secretKey;
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2020-08-27",
    });
  }

  public get stripeApi() {
    return this.stripe;
  }
}
