import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { Utils } from "../../../../../core/utils/Utils";
import { KeysRequired } from "../../../../common/domain/Types";
import { InputTransaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { CardWithdrawalTransactionRequest } from "../../../dto/transaction.service.dto";
import { TransactionProcessor } from "../transaction.processor";

@Injectable()
export class CardWithdrawalProcessor implements TransactionProcessor {
  private readonly validationKeys: KeysRequired<CardWithdrawalTransactionRequest> = {
    nobaTransactionID: Joi.string().required(),
    debitConsumerID: Joi.string().required(),
    debitAmountInUSD: Joi.number().required(),
    creditAmount: Joi.number().required(),
    creditCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    exchangeRate: Joi.number().required(),
    memo: Joi.string().required(),
  };

  constructor() {}

  async validate(request: CardWithdrawalTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: CardWithdrawalTransactionRequest): Promise<InputTransaction> {
    return {
      id: request.nobaTransactionID,
      transactionRef: Utils.generateLowercaseUUID(true),
      workflowName: WorkflowName.CARD_WITHDRAWAL,
      debitAmount: request.debitAmountInUSD,
      debitCurrency: Currency.USD,
      debitConsumerID: request.debitConsumerID,
      creditAmount: request.creditAmount,
      creditCurrency: request.creditCurrency,
      memo: request.memo,
      exchangeRate: request.exchangeRate,
      sessionKey: "CARD_WITHDRAWAL",
      transactionFees: [],
    };
  }

  private performStaticValidations(request: CardWithdrawalTransactionRequest): void {
    const validationSchema = Joi.object(this.validationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(request, validationSchema);
  }

  private async performDynamicValidations(request: CardWithdrawalTransactionRequest): Promise<void> {}
}
