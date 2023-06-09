import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { Utils } from "../../../../../core/utils/Utils";
import { KeysRequired } from "../../../../common/domain/Types";
import { InputTransaction, Transaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { CreditAdjustmentTransactionRequest } from "../../../dto/transaction.service.dto";
import { TransactionProcessor } from "../transaction.processor";

@Injectable()
export class CreditAdjustmentProcessor implements TransactionProcessor {
  private readonly validationKeys: KeysRequired<CreditAdjustmentTransactionRequest> = {
    creditConsumerID: Joi.string().required(),
    creditAmount: Joi.number().required(),
    creditCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    memo: Joi.string().required(),
  };

  constructor() {}

  async validate(request: CreditAdjustmentTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: CreditAdjustmentTransactionRequest): Promise<InputTransaction> {
    return {
      workflowName: WorkflowName.CREDIT_ADJUSTMENT,
      exchangeRate: 1,
      memo: request.memo,
      transactionRef: Utils.generateLowercaseUUID(true),
      transactionFees: [],
      sessionKey: WorkflowName.CREDIT_ADJUSTMENT,
      creditAmount: request.creditAmount,
      creditCurrency: request.creditCurrency,
      creditConsumerID: request.creditConsumerID,
      debitAmount: request.creditAmount,
      debitCurrency: request.creditCurrency,
    };
  }

  async performPostProcessing(
    request: CreditAdjustmentTransactionRequest,
    createdTransaction: Transaction,
  ): Promise<void> {}

  private performStaticValidations(request: CreditAdjustmentTransactionRequest): void {
    const validationSchema = Joi.object(this.validationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(request, validationSchema);
  }

  private async performDynamicValidations(request: CreditAdjustmentTransactionRequest): Promise<void> {}
}
