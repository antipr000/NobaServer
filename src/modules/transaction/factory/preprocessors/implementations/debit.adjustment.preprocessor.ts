import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { Utils } from "../../../../../core/utils/Utils";
import { KeysRequired } from "../../../../../modules/common/domain/Types";
import { InputTransaction, WorkflowName } from "../../../../../modules/transaction/domain/Transaction";
import { Currency } from "../../../../../modules/transaction/domain/TransactionTypes";
import { DebitAdjustmentTransactionRequest } from "../../../../../modules/transaction/dto/transaction.service.dto";
import { TransactionPreprocessor } from "../transaction.preprocessor";

@Injectable()
export class DebitAdjustmentPreprocessor implements TransactionPreprocessor {
  private readonly validationKeys: KeysRequired<DebitAdjustmentTransactionRequest> = {
    debitConsumerID: Joi.string().required(),
    debitAmount: Joi.number().required(),
    debitCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    memo: Joi.string().required(),
  };

  constructor() {}

  async validate(request: DebitAdjustmentTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: DebitAdjustmentTransactionRequest): Promise<InputTransaction> {
    return {
      workflowName: WorkflowName.DEBIT_ADJUSTMENT,
      exchangeRate: 1,
      memo: request.memo,
      transactionRef: Utils.generateLowercaseUUID(true),
      transactionFees: [],
      sessionKey: WorkflowName.DEBIT_ADJUSTMENT,
      debitAmount: request.debitAmount,
      debitCurrency: request.debitCurrency,
      debitConsumerID: request.debitConsumerID,
      creditAmount: request.debitAmount,
      creditCurrency: request.debitCurrency,
    };
  }

  private performStaticValidations(request: DebitAdjustmentTransactionRequest): void {
    const validationSchema = Joi.object(this.validationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(request, validationSchema);
  }

  private async performDynamicValidations(request: DebitAdjustmentTransactionRequest): Promise<void> {}
}
