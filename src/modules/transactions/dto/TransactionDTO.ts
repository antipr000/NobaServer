import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionStatus, TransactionType } from "../domain/Types";

export class TransactionAmountsDTO {
  @ApiProperty({ description: "Fiat amount in USD" })
  baseAmount: number;

  @ApiProperty({ description: "Fiat amount in currency represented by 'fiatCurrency' property" })
  fiatAmount: number;

  @ApiProperty({ description: "Fiat currency used to purchase crypto" })
  fiatCurrency: string;

  @ApiProperty({
    description: "Amount of crypto initially expected (see 'cryptoAmountSettled' for final confirmed amount)",
  })
  cryptoQuantityExpected: number;

  @ApiProperty({ description: "Amount of crypto purchased and settled on the blockchain" })
  cryptoAmountSettled: number;

  @ApiProperty({ description: "Cryptocurrency purchased in this transaction" })
  cryptocurrency: string;

  @ApiProperty({ description: "Payment processing fee for the transaction" })
  processingFee: number;

  @ApiProperty({ description: "Network / gas fee required to settle the transaction on chain" })
  networkFee: number;

  @ApiProperty({ description: "Noba service fee for the transaction" })
  nobaFee: number;

  @ApiProperty({ description: "Amount paid inclusive of fees" })
  totalFiatPrice: number;

  @ApiProperty({ description: "Conversion rate used between the 'fiatCurrency' and 'cryptocurrency'" })
  conversionRate: number;

  @ApiProperty({ description: "Total additional fee paid by the consumer for the transacion" })
  totalFee: number;
}
export class TransactionDTO {
  @ApiProperty({ description: "Internal unique reference to this transaction" })
  _id: string;

  @ApiProperty({ description: "Unique transaction reference number" })
  transactionID: string;

  @ApiProperty({ description: "Internal unique reference to the user who initiated the transaction" })
  userID: string;

  @ApiProperty({ enum: Object.values(TransactionStatus), description: "Current status of the transaction" })
  status: TransactionStatus;

  @ApiProperty({ description: "Hash of the transaction as settled on the blockchain" })
  transactionHash: string;

  @ApiProperty({ description: "Timestamp the transaction was submitted" })
  transactionTimestamp: Date;

  @ApiPropertyOptional({ description: "Wallet address to which the crypto purchase was transferred" })
  destinationWalletAddress?: string;

  @ApiProperty({ description: "Unique ID of the payment method used to fund this transaction" })
  paymentMethodID: string;

  @ApiProperty({ description: "All amounts and currency information related to this transaction" })
  amounts: TransactionAmountsDTO;

  @ApiProperty({
    enum: TransactionType,
    description: "Type of the transaction. Can be one of 'onramp', 'offramp', 'wallet', 'swap'",
  })
  type: TransactionType;
}
