import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor, QueueProcessorHelper } from "./QueueProcessorHelper";
import { CheckoutValidationError, CHECKOUT_VALIDATION_ERROR_HTTP_CODE } from "../domain/CheckoutErrorTypes";
import { VerificationService } from "../../../modules/verification/verification.service";
import { BadRequestException } from "@nestjs/common";

@Injectable()
export class FiatTransactionInitiator implements MessageProcessor {
  private queueProcessorHelper: QueueProcessorHelper;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @Inject("TransactionRepo") private readonly transactionRepo: ITransactionRepo,
    private readonly verificationService: VerificationService,
    private readonly consumerService: ConsumerService,
  ) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
    this.init();
  }

  async init() {
    const app = this.queueProcessorHelper.createConsumer(TransactionQueueName.FiatTransactionInitiator, this);

    app.start();
  }

  async process(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.VALIDATION_PASSED && status != TransactionStatus.FIAT_INCOMING_INITIATING) {
      this.logger.info(`Transaction ${transactionId} is not in validate passed state, skipping, status: ${status}`);
      return;
    }

    let checkoutPaymentID: string;
    // If status is already TransactionStatus.FIAT_INCOMING_INITIATING, then we failed this step before. Query checkout to see if our call
    // succeeded and if so, skip checkout and continue with updating transaction status & enqueueing.
    if (status == TransactionStatus.FIAT_INCOMING_INITIATING) {
      // TDOO(#310): query checkout based on transaction.props._id to see if we already have a payment id
    } else {
      //before initiating the transaction we want to update the status so that if the initiator fails we don't execute this block again and manually resolve the failure depending on the type
      transaction = await this.transactionRepo.updateTransaction(
        Transaction.createTransaction({
          ...transaction.props,
          transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATING,
        }),
      );
    }

    // TODO(#310) This is happening before we've called the ZH logic to calculate the true fiat value! We need to call
    // ZH before we even get here!
    if (checkoutPaymentID == undefined) {
      // Fiat Transaction implementation here
      let payment;
      try {
        payment = await this.consumerService.requestCheckoutPayment(
          transaction.props.paymentMethodID,
          transaction.props.leg1Amount,
          transaction.props.leg1,
          transaction.props._id,
        );
      } catch (e) {
        if (e.http_code === CHECKOUT_VALIDATION_ERROR_HTTP_CODE) {
          const paymentMethod = (
            await this.consumerService.getConsumer(transaction.props.userId)
          ).props.paymentMethods.filter(
            currPaymentMethod => currPaymentMethod.paymentToken === transaction.props.paymentMethodID,
          )[0];
          const errorBody: CheckoutValidationError = e.body;
          const errorDescription = errorBody.error_type;
          const errorCode = errorBody.error_codes.join(",");

          this.logger.error(`Fiat payment failed: Error code: ${errorCode}, Error Description: ${errorDescription}`);

          await this.verificationService.provideTransactionFeedback(
            errorCode,
            errorDescription,
            transaction.props._id,
            paymentMethod.paymentProviderID,
          );
        }
        this.logger.error(`Fiat payment failed: Name: ${JSON.stringify(e)}`);

        transaction = await this.transactionRepo.updateTransaction(
          Transaction.createTransaction({
            ...transaction.props,
            transactionStatus: TransactionStatus.FIAT_INCOMING_FAILED,
            checkoutPaymentID: checkoutPaymentID,
          }),
        );
        await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.TransactionFailed, transactionId);
      }

      checkoutPaymentID = payment["id"];
    }

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        checkoutPaymentID: checkoutPaymentID,
      }),
    );

    //Move to initiated queue, db poller will take delay to put it to queue as it's scheduled so we move it to the target queue directly from here
    await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.FiatTransactionInitated, transactionId);
  }
}
