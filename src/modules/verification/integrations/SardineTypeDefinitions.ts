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
    documentVerificationResult: {
      verificationId: string;
      status: string;
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
      errorCodes: string[];
    };
  };
};

export type CaseNotificationWebhookRequest = {
  id: string;
  type: string;
  timestamp: string;
  data: {
    action: {
      source: string;
      user_email: string;
      value: string;
    };
    case: {
      sessionKey: string;
      customerID: string;
      status: string;
      checkpoint: string;
      transactionID: string;
    };
  };
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
