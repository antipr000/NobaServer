import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { Utils } from "../../../../../core/utils/Utils";
import { KeysRequired } from "../../../../../modules/common/domain/Types";
import { InputTransaction, WorkflowName } from "../../../../../modules/transaction/domain/Transaction";
import { Currency } from "../../../../../modules/transaction/domain/TransactionTypes";
import {
  CardReversalTransactionRequest,
  CardReversalTransactionType,
} from "../../../../../modules/transaction/dto/transaction.service.dto";
import { TransactionPreprocessor } from "../transaction.preprocessor";

@Injectable()
export class CardReversalPreprocessor implements TransactionPreprocessor {
  private readonly validationKeys: KeysRequired<CardReversalTransactionRequest> = {
    type: Joi.string()
      .required()
      .valid(...Object.values(CardReversalTransactionType)),
    nobaTransactionID: Joi.string().required(),
    consumerID: Joi.string().required(),
    amountInUSD: Joi.number().required(),
    exchangeRate: Joi.number().required(),
    memo: Joi.string().required(),
  };

  constructor() {}

  async validate(request: CardReversalTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: CardReversalTransactionRequest): Promise<InputTransaction> {
    if (request.type === CardReversalTransactionType.CREDIT) {
      return {
        id: request.nobaTransactionID,
        transactionRef: Utils.generateLowercaseUUID(true),
        workflowName: WorkflowName.CARD_REVERSAL,
        creditAmount: request.amountInUSD,
        creditCurrency: Currency.USD,
        creditConsumerID: request.consumerID,
        memo: request.memo,
        exchangeRate: request.exchangeRate,
        sessionKey: "CARD_REVERSAL",
        transactionFees: [],
      };
    } else {
      return {
        id: request.nobaTransactionID,
        transactionRef: Utils.generateLowercaseUUID(true),
        workflowName: WorkflowName.CARD_REVERSAL,
        debitAmount: request.amountInUSD,
        debitCurrency: Currency.USD,
        debitConsumerID: request.consumerID,
        memo: request.memo,
        exchangeRate: request.exchangeRate,
        sessionKey: "CARD_REVERSAL",
        transactionFees: [],
      };
    }
  }

  private performStaticValidations(request: CardReversalTransactionRequest): void {
    const validationSchema = Joi.object(this.validationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(request, validationSchema);
  }

  private async performDynamicValidations(request: CardReversalTransactionRequest): Promise<void> {}
}
