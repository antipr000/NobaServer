import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { ServiceErrorCode, ServiceException } from "../../../../../core/exception/service.exception";
import { ConsumerService } from "../../../../consumer/consumer.service";
import { Consumer } from "../../../../consumer/domain/Consumer";
import { Utils } from "../../../../../core/utils/Utils";
import { KeysRequired } from "../../../../common/domain/Types";
import { InputTransaction, Transaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { WalletTransferTransactionRequest } from "../../../dto/transaction.service.dto";
import { TransactionProcessor } from "../transaction.processor";
import { WorkflowExecutor } from "../../../../../infra/temporal/workflow.executor";
import { WorkflowInitiator } from "../workflow.initiator";

@Injectable()
export class WalletTransferProcessor implements TransactionProcessor, WorkflowInitiator {
  private readonly validationKeys: KeysRequired<WalletTransferTransactionRequest> = {
    creditConsumerIDOrTag: Joi.string().required(),
    debitConsumerIDOrTag: Joi.string().required(),
    debitAmount: Joi.number().required(),
    debitCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    memo: Joi.string().required(),
    sessionKey: Joi.string().required(),
  };

  constructor(private readonly consumerService: ConsumerService, private readonly workflowExecutor: WorkflowExecutor) {}

  async validate(request: WalletTransferTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: WalletTransferTransactionRequest): Promise<InputTransaction> {
    const creditConsumer: Consumer = await this.consumerService.getActiveConsumer(request.creditConsumerIDOrTag);
    const debitConsumer: Consumer = await this.consumerService.getActiveConsumer(request.debitConsumerIDOrTag);

    return {
      workflowName: WorkflowName.WALLET_TRANSFER,
      exchangeRate: 1,
      memo: request.memo,
      transactionRef: Utils.generateLowercaseUUID(true),
      transactionFees: [],
      sessionKey: request.sessionKey,
      debitAmount: request.debitAmount,
      debitCurrency: request.debitCurrency,
      debitConsumerID: debitConsumer.props.id,
      creditConsumerID: creditConsumer.props.id,
      creditAmount: request.debitAmount,
      creditCurrency: request.debitCurrency,
    };
  }

  async initiateWorkflow(transactionID: string, transactionRef: string): Promise<void> {
    await this.workflowExecutor.executeWalletTransferWorkflow(transactionID, transactionRef);
  }

  async performPostProcessing(
    request: WalletTransferTransactionRequest,
    createdTransaction: Transaction,
  ): Promise<void> {}

  private performStaticValidations(request: WalletTransferTransactionRequest): void {
    try {
      const validationSchema = Joi.object(this.validationKeys).options({
        allowUnknown: false,
        stripUnknown: true,
      });
      Joi.attempt(request, validationSchema);
    } catch (e) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: e.message,
      });
    }
  }

  private async performDynamicValidations(request: WalletTransferTransactionRequest): Promise<void> {
    const creditConsumer: Consumer = await this.consumerService.getActiveConsumer(request.creditConsumerIDOrTag);
    if (!creditConsumer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Consumer specified in 'creditConsumerIDOrTag' does not exist or is not active",
      });
    }

    const debitConsumer: Consumer = await this.consumerService.getActiveConsumer(request.debitConsumerIDOrTag);
    if (!debitConsumer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Consumer specified in 'debitConsumerIDOrTag' does not exist or is not active",
      });
    }
  }
}
