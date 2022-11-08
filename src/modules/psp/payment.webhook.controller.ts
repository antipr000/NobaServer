import { Body, Controller, Headers, HttpStatus, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { PaymentCapturePendingWebhookData, PaymentPendingWebhookData } from "./domain/CheckoutTypes";
import { CheckoutWebhooksMapper } from "./mapper/checkout.webhooks";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { CheckoutConfigs } from "../../config/configtypes/CheckoutConfigs";
import { CHECKOUT_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { ITransactionRepo } from "../transactions/repo/TransactionRepo";

const crypto_ts = require("crypto");

@Roles(Role.AppAdmin)
@Controller()
export class PaymentWebhooksController {
  private webhookSignatureKey: string;

  constructor(
    @Inject("TransactionRepo") private readonly transactionsRepo: ITransactionRepo,
    private readonly checkoutWebhooksMapper: CheckoutWebhooksMapper,
    configService: CustomConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.webhookSignatureKey = configService.get<CheckoutConfigs>(CHECKOUT_CONFIG_KEY).webhookSignatureKey;
  }

  @Post("/vendors/checkout/webhooks")
  @ApiTags("Vendors")
  @ApiOperation({ summary: "Checks if the transaction parameters are valid" })
  @ApiResponse({ status: HttpStatus.OK })
  async checkIfTransactionPossible(@Body() requestBody, @Headers() headers) {
    this.logger.info(`Received Checkout webhook event with ID: '${requestBody.id}'`);

    let isValidRequest = true;
    const requiredFields = ["type", "id", "data"];
    requiredFields.forEach(field => {
      if (requestBody.type === undefined || requestBody.type === null) {
        isValidRequest = false;
        return;
      }
    });
    if (!isValidRequest) {
      this.logger.error(`Invalid webhook event from Checkout: ${JSON.stringify(requestBody)}`);
      return;
    }

    if (!this.IsAuthenticRequest(requestBody, headers["cko-signature"])) {
      this.logger.error(
        `Someone tries to impersonate Checkout. Request: "${JSON.stringify(requestBody)}" and headers: ${JSON.stringify(
          headers,
        )}`,
      );
      return;
    }

    switch (requestBody.type) {
      case "payment_pending": {
        const paymentPendingEvent: PaymentPendingWebhookData =
          this.checkoutWebhooksMapper.convertRawPaymentPendingWebhook(requestBody.data);

      }

      case "payment_capture_pending": {
        const paymentCapturePendingEvent: PaymentCapturePendingWebhookData =
          this.checkoutWebhooksMapper.convertRawPaymentCapturePendingWebhook(requestBody.data);
      }

      case "payment_declined": {
      }
      case "payment_captured": {
      }
      case "payment_returned": {
      }

      default: {
        this.logger.error(`Invalid 'type' in Checkout webhook event: "${JSON.stringify(requestBody)}"`);
        return;
      }
    }
  }

  private IsAuthenticRequest(body, receivedSignature: string): boolean {
    const payload = JSON.stringify(body ? body : {});
    const expectedSignature = crypto_ts.createHmac("sha256", this.webhookSignatureKey).update(payload).digest("hex");

    this.logger.info(
      `Received signature "${receivedSignature}" and expected signature based on request body is "${expectedSignature}"`,
    );
    return expectedSignature === receivedSignature;
  }
}
