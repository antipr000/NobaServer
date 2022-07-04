import { Injectable } from "@nestjs/common";
import Checkout from "checkout-sdk-node";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

@Injectable()
export class CheckoutService {
  private readonly checkout: Checkout;

  constructor(private configService: CustomConfigService) {
    // TODO: Add secret and private key for checkout to AWS Secret Manager and get from there like we do for stripe below
    // const stripeSecretKey = this.configService.get<StripeConfigs>(STRIPE_CONFIG_KEY).secretKey;
    const checkoutSecretKey = "sk_sbox_xdhkcai4bosm32intni46my5x4j";
    const checkoutPrivatekey = "pk_sbox_m3756a5g3z4ootpdssqy3hxxemv";
    this.checkout = new Checkout(checkoutSecretKey, {
      pk: checkoutPrivatekey,
    });
  }

  public get checkoutApi() {
    return this.checkout;
  }
}
