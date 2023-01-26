export class DebitBankRequestDTO {
  transactionID: string;
  transactionRef: string;
  amount: number;
  currency: string;
  consumerID: string;
  bankCode: string;
  accountNumber: string;
  accountType: string;
  documentNumber: string;
  documentType: string;
}
