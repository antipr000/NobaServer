export type Address = {
  street1?: string;
  street2?: string;
  city: string;
  regionCode?: string;
  postalCode: string;
  countryCode: string;
  region?: string; // region is used for document verification input data
};

export type Customer = {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  address?: Address;
  phone?: string;
  isPhoneVerified?: boolean;
  emailAddress?: string;
  isEmailVerified?: boolean;
  dateOfBirth?: string;
  taxId?: string;
};

export type Card = {
  first6?: string;
  last4?: string;
  hash?: string;
};

export type Crypto = {
  currencyCode?: string;
  address?: string;
};

export type PaymentMethod = {
  type: PaymentMethodTypes;
  card?: Card;
  crypto?: Crypto;
};

export type Recipient = {
  id?: string;
  paymentMethod?: PaymentMethod;
  isKycVerified?: boolean;
  emailAddress?: string;
};

export type Transaction = {
  id: string;
  status?: string;
  createdAtMillis: number;
  amount?: number;
  currencyCode?: string;
  itemCategory?: string;
  actionType?: string;
  paymentMethod?: PaymentMethod;
  recipient?: Recipient;
};

export type SardineCustomerRequest = {
  flow: string;
  sessionKey: string;
  customer: Customer;
  transaction?: Transaction;
  checkpoints: string[];
};

export type SardineDocumentVerificationInputData = {
  dateOfBirth?: string;
  issuingCountry: string;
  firstName: string;
  lastName?: string;
  address?: Address;
};

export enum SardineRiskLevels {
  VERY_HIGH = "very_high",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export enum SardineDocumentProcessingStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETE = "complete",
  REJECTED = "rejected",
}

export enum PaymentMethodTypes {
  CARD = "card",
  BANK = "bank",
  WIRE = "wire",
  CRYPTO = "crypto",
}
