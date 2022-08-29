import { ApiProperty } from "@nestjs/swagger";
import { ConsumerSimpleDTO } from "../../../modules/consumer/dto/ConsumerDTO";
import { TransactionDTO } from "../../../modules/transactions/dto/TransactionDTO";

export enum WebhookType {
  TRANSACTION_CONFIRM = "TransConfirm",
}

export class TransConfirmDTO {
  @ApiProperty()
  consumer: ConsumerSimpleDTO;

  @ApiProperty()
  transaction: TransactionDTO;
}
