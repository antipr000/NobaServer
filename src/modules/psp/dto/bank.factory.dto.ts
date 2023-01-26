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

// Contains mono specific fields. This should be expanded to include other banks.
export class DebitBankResponseDTO {
  withdrawalID: string;
  state: string;
  declinationReason?: string;
}
