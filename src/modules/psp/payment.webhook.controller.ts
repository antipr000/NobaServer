import { Body, Controller, ForbiddenException, Headers, HttpStatus, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CheckoutWebhooksMapper } from "./mapper/checkout.webhooks";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { CheckoutConfigs } from "../../config/configtypes/CheckoutConfigs";
import { CHECKOUT_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { ITransactionRepo } from "../transaction/repo/transaction.repo";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";
import { createHmac } from "crypto";
import { TRANSACTION_REPO_PROVIDER } from "../transaction/repo/transaction.repo.module";

@IsNoApiKeyNeeded()
@Controller("v1")
export class PaymentWebhooksController {
  private webhookSignatureKey: string;

  constructor(
    @Inject(TRANSACTION_REPO_PROVIDER) private readonly transactionsRepo: ITransactionRepo,
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
  async consumePaymentWebhooks(@Body() requestBody, @Headers() headers) {
    throw new ForbiddenException("This endpoint is not available");
    /* this.logger.info(`Received Checkout webhook event with ID: '${requestBody.id}'`);

    let isValidRequest = true;
    const requiredFields = ["type", "id", "data"];
    requiredFields.forEach(field => {
      if (requestBody[field] === undefined || requestBody[field] === null) {
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

        await this.transactionsRepo.updateFiatTransactionInfo({
          details: JSON.stringify(paymentPendingEvent),
          transactionID: paymentPendingEvent.idempotencyID,
          willUpdateIsApproved: false,
          willUpdateIsCompleted: false,
          willUpdateIsFailed: false,
        });
        break;
      }

      case "payment_capture_pending": {
        const paymentCapturePendingEvent: PaymentCapturePendingWebhookData =
          this.checkoutWebhooksMapper.convertRawPaymentCapturePendingWebhook(requestBody.data);

        await this.transactionsRepo.updateFiatTransactionInfo({
          details: JSON.stringify(paymentCapturePendingEvent),
          transactionID: paymentCapturePendingEvent.idempotencyID,
          willUpdateIsApproved: true,
          updatedIsApprovedValue: true,
          willUpdateIsCompleted: false,
          willUpdateIsFailed: false,
        });
        break;
      }

      case "payment_declined": {
        this.logger.error(`'payment_declined' event is received - "${JSON.stringify(requestBody)}"`);
        break;
      }

      case "payment_captured": {
        const paymentCapturedWebhookData: PaymentCapturedWebhookData =
          this.checkoutWebhooksMapper.convertRawPaymentCapturedWebhook(requestBody.data);

        await this.transactionsRepo.updateFiatTransactionInfo({
          details: JSON.stringify(paymentCapturedWebhookData),
          transactionID: paymentCapturedWebhookData.idempotencyID,
          willUpdateIsApproved: false,
          willUpdateIsCompleted: true,
          updatedIsCompletedValue: true,
          willUpdateIsFailed: false,
        });
        break;
      }

      case "payment_returned": {
        this.logger.error(`'payment_declined' event is received - "${JSON.stringify(requestBody)}"`);
        break;
      }

      default: {
        this.logger.error(`Invalid 'type' in Checkout webhook event: "${JSON.stringify(requestBody)}"`);
        return;
      }
    }*/
  }

  private IsAuthenticRequest(body, receivedSignature: string): boolean {
    const payload = JSON.stringify(body ? body : {});
    const expectedSignature = createHmac("sha256", this.webhookSignatureKey).update(payload).digest("hex");

    this.logger.info(
      `Received signature "${receivedSignature}" and expected signature based on request body is "${expectedSignature}"`,
    );
    return expectedSignature === receivedSignature;
  }
}
