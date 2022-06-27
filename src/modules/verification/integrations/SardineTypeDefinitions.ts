export type Address = {
  street1?: string;
  street2?: string;
  city: string;
  regionCode: string;
  postalCode: string;
  countryCode: string;
};

export type Customer = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  address: Address;
  phone: string;
  isPhoneVerified: boolean;
  emailAddress: string;
  isEmailVerified: boolean;
  dateOfBirth: string;
  taxId?: string;
};

export type SardineCustomerRequest = {
  flow: string;
  sessionKey: string;
  customer: Customer;
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
