import { Injectable } from "@nestjs/common";
import Checkout from "checkout-sdk-node";
import { CheckoutConfigs } from "../../config/configtypes/CheckoutConfigs";
import { CHECKOUT_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

@Injectable()
export class CheckoutService {
  private readonly checkout: Checkout;

  constructor(private configService: CustomConfigService) {
    const checkoutSecretKey = configService.get<CheckoutConfigs>(CHECKOUT_CONFIG_KEY).secretKey;
    const checkoutPublicKey = configService.get<CheckoutConfigs>(CHECKOUT_CONFIG_KEY).publicKey;
    this.checkout = new Checkout(checkoutSecretKey, {
      pk: checkoutPublicKey,
    });
  }

  public get checkoutAPI() {
    return this.checkout;
  }
}
