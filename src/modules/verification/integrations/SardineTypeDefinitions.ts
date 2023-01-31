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
  createdAtMillis?: number;
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

export type Bank = {
  accountNumber: string;
  routingNumber: string;
  accountType?: string;
  balance?: number;
  balanceCurrencyCode?: string;
  id?: string;
  idSource?: string;
};

export type Wire = {
  accountNumber: string;
  swiftCode?: string;
  iban?: string;
  routingCode?: string;
  transferType?: "international_wire" | "domestic_wire";
};

export type Other = {
  id: string;
  type: string;
  isVerified?: boolean;
  extraData?: string;
};

export type PaymentMethod = {
  type: PaymentMethodTypes;
  card?: Card;
  crypto?: Crypto;
  bank?: Bank;
  wire?: Wire;
  other?: Other;
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
  transaction?: Transaction; // Only for transaction flow
  checkpoints: string[];
};

export type SardineDocumentVerificationInputData = {
  dateOfBirth?: string;
  issuingCountry: string;
  firstName: string;
  lastName?: string;
  address?: Address;
};

export type DeviceAttributes = {
  Browser: string[];
  Model: string[];
  OS: string[];
};

export type Signals = {
  key: string;
  value: string;
};

export type BehaviorBiometricsFields = {
  name?: string;
  numCopyPasteEvents?: number;
  numClipboardEvents?: number;
  numAutoFillEvents?: number;
  numExpertKeyEvents?: number;
  hesitationPercentage?: number;
  isLTM?: boolean;
  timeSpendInMsEvents?: number[];
};

export type DeviceBehaviorBiometrics = {
  numDistractionEvents?: number;
  fields: BehaviorBiometricsFields[];
};

export type DeviceIpLocation = {
  city?: string;
  region?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
};

export type DeviceGpsLocation = {
  city?: string;
  region?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  mockLevel?: string;
};

export type IdentityDocumentURLRequest = {
  sessionKey: string;
  idback: boolean;
  selfie: boolean;
  poa: boolean;
  locale: string;
  inputData: {
    firstName: string;
    lastName: string;
    address: {
      street1: string;
      city: string;
      region: string;
      postalCode: string;
      countryCode: string;
    };
  };
};

export type IdentityDocumentURLResponse = {
  id: string;
  link: {
    expiredAt: string;
    url: string;
  };
};

export type SardineDeviceInformationResponse = {
  id: string;
  level: SardineRiskLevels;
  attributes?: DeviceAttributes;
  signals?: Signals[];
  sessionKey: string;
  fingerprint?: string;
  fingerprintConfidenceScore?: number;
  behaviorBiometricRiskLevel?: string;
  deviceReputation?: string;
  behaviorBiometrics?: DeviceBehaviorBiometrics;
  ipLocation?: DeviceIpLocation;
  gpsLocation?: DeviceGpsLocation;
};

export type DocumentVerificationWebhookRequest = {
  id: string;
  type: string;
  timestamp: string;
  data: {
    action: {
      source: string;
    };
    case: {
      sessionKey: string;
      customerID: string;
    };
  };
  documentVerificationResult: DocumentVerificationSardineResponse;
};

export type DocumentVerificationSardineResponse = {
  verificationId: string;
  status: SardineDocumentProcessingStatus;
  documentData: {
    type: string;
    number: string;
    dateOfBirth: string;
    dateOfIssue: string;
    dateOfExpiry: string;
    issuingCountry: string;
    firstName: string;
    middleName: string;
    lastName: string;
    gender: string;
    address: string;
  };
  verification: {
    riskLevel: SardineRiskLevels;
    forgeryLevel: SardineRiskLevels;
    documentMatchLevel: SardineRiskLevels;
    imageQualityLevel: string;
    faceMatchLevel: string;
    reasonCodes: string[];
  };
  errorCodes: DocumentVerificationErrorCodes[];
};

export enum DocumentVerificationErrorCodes {
  DOCUMENT_REQUIRES_RECAPTURE = "requires_recapture",
  DOCUMENT_UNRECOGNIZABLE = "unrecognizable_document",
  DOCUMENT_BAD_SIZE_OR_TYPE = "document_bad_size_or_type",
}

export type CaseNotificationWebhookRequest = {
  id: string;
  type: string;
  timestamp: string;
  data: {
    action: {
      source: string;
      user_email?: string;
      value?: string;
    };
    case: {
      sessionKey: string;
      customerID: string;
      status?: string;
      checkpoint?: string;
      transactionID?: string;
    };
  };
};

export type Feedback = {
  id: string;
  scope?: string;
  type?: FeedbackType;
  status?: FeedbackStatus;
  reason?: string;
  description?: string;
  processor?: string;
  timeMillis?: number;
};

export type FeedbackRequest = {
  sessionKey: string;
  feedback: Feedback;
};

export enum SardineRiskLevels {
  UNKNOWN = "unknown",
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
  ERROR = "error",
}

export enum PaymentMethodTypes {
  CARD = "card",
  BANK = "bank",
  WIRE = "wire",
  CRYPTO = "crypto",
  OTHER = "other",
}

export enum CaseStatus {
  PENDING = "pending",
  NOT_STARTED = "not-started",
  IN_PROGRESS = "in-progress",
  WAITING_FOR_CLIENT = "waiting-for-client",
  RESOLVED = "resolved",
}

export enum CaseAction {
  CREATED = "created",
  NONE = "none",
  APPROVE = "approve",
  DECLINE = "decline",
}

export enum FeedbackType {
  KYC = "kyc",
  ONBOARDING = "onboarding",
  SIGNUP = "signup",
  LOGIN = "login",
  SETTLEMENT = "settlement",
  AUTHORIZATION = "authorization",
}

export enum FeedbackStatus {
  APPROVED = "approved",
  DECLINED = "declined",
  CHARGEBACK_DISPUTE = "chargeback_dispute",
  CHARGEBACK_FRAUD = "chargeback_fraud",
  CHARGEBACK_REVERSAL = "chargeback_reversal",
  RETURN = "return",
  SETTLED = "settled",
  SUSPECTED_FRAUD = "suspected_fraud",
}
