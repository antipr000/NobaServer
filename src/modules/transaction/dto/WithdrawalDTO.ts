import { ApiProperty } from "@nestjs/swagger";
import { AccountType, DocumentType } from "../domain/WithdrawalDetails";

export class WithdrawalDTO {
  @ApiProperty()
  bankCode: string;

  @ApiProperty()
  accountNumber: string;

  @ApiProperty({ enum: AccountType })
  accountType: AccountType;

  @ApiProperty()
  documentNumber: string;

  @ApiProperty({ enum: DocumentType })
  documentType: DocumentType;
}
