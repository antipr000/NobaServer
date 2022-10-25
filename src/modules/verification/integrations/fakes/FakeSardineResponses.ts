import {
  CaseNotificationWebhookRequest,
  DocumentVerificationErrorCodes,
  DocumentVerificationSardineResponse,
  SardineDeviceInformationResponse,
  SardineDocumentProcessingStatus,
  SardineRiskLevels,
} from "../SardineTypeDefinitions";

export const KYC_SSN_LOW_RISK = {
  data: {
    sessionKey: "280CBF35-B4B0-4193-A111",
    level: "low",
    status: "Success",
    customer: {
      score: 34,
      level: "low",
      reasonCodes: [],
      signals: [
        {
          key: "adverseMediaLevel",
          value: "low",
        },
        {
          key: "emailDomainLevel",
          value: "low",
        },
        {
          key: "emailLevel",
          value: "low",
          reasonCodes: [],
        },
        {
          key: "nsfLevel",
          value: "low",
        },
        {
          key: "pepLevel",
          value: "low",
        },
        {
          key: "phoneCarrier",
          value: "T-Mobile USA",
        },
        {
          key: "phoneLevel",
          value: "low",
          reasonCodes: ["POL", "POO", "PPT", "PRM", "PUV"],
        },
        {
          key: "phoneLineType",
          value: "Mobile",
        },
        {
          key: "sanctionLevel",
          value: "low",
        },
        {
          key: "taxIdDobMatch",
          value: "exact",
        },
        {
          key: "taxIdLevel",
          value: "medium",
        },
        {
          key: "taxIdMatch",
          value: "exact",
        },
        {
          key: "taxIdNameMatch",
          value: "exact",
        },
        {
          key: "taxIdStateMatch",
          value: "exact",
        },
      ],
    },
    checkpoints: {
      customer: {
        customerPurchaseLevel: {
          value: "low",
          ruleIds: [83],
        },
        emailLevel: {
          value: "low",
          ruleIds: [83],
        },
        historicalLevel: {
          value: "low",
          ruleIds: [83],
        },
        phoneLevel: {
          value: "low",
          ruleIds: [32],
        },
        riskLevel: {
          value: "low",
          ruleIds: [83],
        },
        taxIdLevel: {
          value: "low",
          ruleIds: [83],
        },
      },
    },
    features: {
      "CustomerSession.GPSToCustomerAddressDistance": 0,
      "Device.CountCountries": 0,
      "Device.CountCustomerIDs": 0,
      "Device.CountEmails": 0,
      "Email.CountSocialMediaFriends": 0,
      "Email.CountSocialMediaLinks": 0,
      "Email.FirstSeenAt": 1642576612,
      "TaxID.NameDobSharedCount": 0,
      "TaxID.NameSSNSyntheticAddress": false,
      "TaxID.SSNBogus": false,
      "TaxID.SSNDobsExactMatch": null,
      "TaxID.SSNEmailsExactMatch": null,
      "TaxID.SSNHistoryLongerMonths": 0,
      "TaxID.SSNIssuanceDobMismatch": false,
      "TaxID.SSNIssuedBeforeDob": false,
      "TaxID.SSNNamesExactMatch": null,
      "TaxID.SSNPhonesExactMatch": null,
      "TaxID.SSNSharedCount": 0,
      "User.CountDevices": 0,
    },
  },
};

export const KYC_SSN_HIGH_RISK = {
  data: {
    sessionKey: "280CBF35-B4B0-4193-A111",
    level: "high",
    status: "Success",
    customer: {
      score: 34,
      level: "high",
      reasonCodes: ["ENP"],
      signals: [
        {
          key: "adverseMediaLevel",
          value: "low",
        },
        {
          key: "emailDomainLevel",
          value: "high",
          reasonCodes: ["ENP"],
        },
        {
          key: "emailLevel",
          value: "medium",
          reasonCodes: ["ENP"],
        },
        {
          key: "nsfLevel",
          value: "low",
        },
        {
          key: "pepLevel",
          value: "low",
        },
        {
          key: "phoneCarrier",
          value: "T-Mobile USA",
        },
        {
          key: "phoneLevel",
          value: "high",
          reasonCodes: ["FAKE"],
        },
        {
          key: "phoneLineType",
          value: "Mobile",
        },
        {
          key: "sanctionLevel",
          value: "low",
        },
        {
          key: "taxIdDobMatch",
          value: "exact",
        },
        {
          key: "taxIdLevel",
          value: "medium",
        },
        {
          key: "taxIdMatch",
          value: "exact",
        },
        {
          key: "taxIdNameMatch",
          value: "exact",
        },
        {
          key: "taxIdStateMatch",
          value: "exact",
        },
      ],
    },
    checkpoints: {
      customer: {
        customerPurchaseLevel: {
          value: "low",
          ruleIds: [83],
        },
        emailLevel: {
          value: "high",
          ruleIds: [300],
        },
        historicalLevel: {
          value: "low",
          ruleIds: [83],
        },
        phoneLevel: {
          value: "high",
          ruleIds: [300],
        },
        riskLevel: {
          value: "high",
          ruleIds: [300],
        },
        taxIdLevel: {
          value: "high",
          ruleIds: [300],
        },
      },
    },
    features: {
      "CustomerSession.GPSToCustomerAddressDistance": 0,
      "Device.CountCountries": 0,
      "Device.CountCustomerIDs": 0,
      "Device.CountEmails": 0,
      "Email.CountSocialMediaFriends": 0,
      "Email.CountSocialMediaLinks": 0,
      "Email.FirstSeenAt": 1642576612,
      "TaxID.NameDobSharedCount": 0,
      "TaxID.NameSSNSyntheticAddress": false,
      "TaxID.SSNBogus": false,
      "TaxID.SSNDobsExactMatch": null,
      "TaxID.SSNEmailsExactMatch": null,
      "TaxID.SSNHistoryLongerMonths": 0,
      "TaxID.SSNIssuanceDobMismatch": false,
      "TaxID.SSNIssuedBeforeDob": false,
      "TaxID.SSNNamesExactMatch": null,
      "TaxID.SSNPhonesExactMatch": null,
      "TaxID.SSNSharedCount": 0,
      "User.CountDevices": 0,
    },
  },
};

export const KYC_SSN_VERY_HIGH_RISK = {
  data: {
    sessionKey: "280CBF35-B4B0-4193-A111",
    level: "very_high",
    status: "Success",
    customer: {
      score: 10,
      level: "very_high",
      reasonCodes: ["ENP"],
      signals: [
        {
          key: "adverseMediaLevel",
          value: "",
        },
        {
          key: "emailDomainLevel",
          value: "high",
        },
        {
          key: "emailLevel",
          value: "medium",
          reasonCodes: ["ENP"],
        },
        {
          key: "nsfLevel",
          value: "high",
        },
        {
          key: "pepLevel",
          value: "high",
        },
        {
          key: "phoneCarrier",
          value: "T-Mobile USA",
        },
        {
          key: "phoneLevel",
          value: "high",
          reasonCodes: [],
        },
        {
          key: "phoneLineType",
          value: "Mobile",
        },
        {
          key: "sanctionLevel",
          value: "high",
        },
        {
          key: "taxIdDobMatch",
          value: "exact",
        },
        {
          key: "taxIdLevel",
          value: "medium",
        },
        {
          key: "taxIdMatch",
          value: "exact",
        },
        {
          key: "taxIdNameMatch",
          value: "exact",
        },
        {
          key: "taxIdStateMatch",
          value: "exact",
        },
      ],
    },
    checkpoints: {
      customer: {
        customerPurchaseLevel: {
          value: "high",
          ruleIds: [83],
        },
        emailLevel: {
          value: "medium",
          ruleIds: [277],
        },
        historicalLevel: {
          value: "high",
          ruleIds: [83],
        },
        phoneLevel: {
          value: "high",
          ruleIds: [32],
        },
        riskLevel: {
          value: "medium",
          ruleIds: [215, 277],
        },
        taxIdLevel: {
          value: "high",
          ruleIds: [300],
        },
      },
    },
    features: {
      "CustomerSession.GPSToCustomerAddressDistance": 0,
      "Device.CountCountries": 0,
      "Device.CountCustomerIDs": 0,
      "Device.CountEmails": 0,
      "Email.CountSocialMediaFriends": 0,
      "Email.CountSocialMediaLinks": 0,
      "Email.FirstSeenAt": 1642576612,
      "TaxID.NameDobSharedCount": 0,
      "TaxID.NameSSNSyntheticAddress": false,
      "TaxID.SSNBogus": false,
      "TaxID.SSNDobsExactMatch": null,
      "TaxID.SSNEmailsExactMatch": null,
      "TaxID.SSNHistoryLongerMonths": 0,
      "TaxID.SSNIssuanceDobMismatch": false,
      "TaxID.SSNIssuedBeforeDob": false,
      "TaxID.SSNNamesExactMatch": null,
      "TaxID.SSNPhonesExactMatch": null,
      "TaxID.SSNSharedCount": 0,
      "User.CountDevices": 0,
    },
  },
};

export const FAKE_GOOD_TRANSACTION = {
  data: {
    sessionKey: "aml-123",
    level: "low",
    status: "Success",
    customer: {
      score: 27,
      level: "low",
      signals: [
        {
          key: "adverseMediaLevel",
          value: "low",
        },
        {
          key: "amlRiskLevel",
          value: "low",
        },
        {
          key: "bankLevel",
          value: "low",
        },
        {
          key: "emailDomainLevel",
          value: "low",
        },
        {
          key: "emailLevel",
          value: "low",
        },
        {
          key: "nsfLevel",
          value: "low",
          reasonCodes: ["D"],
        },
        {
          key: "pepLevel",
          value: "low",
        },
        {
          key: "phoneLevel",
          value: "low",
        },
        {
          key: "sanctionLevel",
          value: "low",
        },
        {
          key: "taxIdLevel",
          value: "",
          reasonCodes: ["HST"],
        },
        {
          key: "cryptoAddressLevel",
          value: "low",
        },
      ],
    },
  },
};

export const FAKE_HIGH_RISK_TRANSACTION = {
  data: {
    sessionKey: "aml-123",
    level: "high",
    status: "Success",
    customer: {
      score: 27,
      level: "high",
      signals: [
        {
          key: "adverseMediaLevel",
          value: "low",
        },
        {
          key: "amlRiskLevel",
          value: "low",
        },
        {
          key: "bankLevel",
          value: "low",
        },
        {
          key: "emailDomainLevel",
          value: "low",
        },
        {
          key: "emailLevel",
          value: "low",
        },
        {
          key: "nsfLevel",
          value: "low",
          reasonCodes: ["D"],
        },
        {
          key: "pepLevel",
          value: "medium",
        },
        {
          key: "phoneLevel",
          value: "low",
        },
        {
          key: "sanctionLevel",
          value: "medium",
        },
        {
          key: "taxIdLevel",
          value: "",
          reasonCodes: ["HST"],
        },
        {
          key: "cryptoAddressLevel",
          value: "high",
        },
      ],
    },
  },
};

export const FAKE_FRAUDULENT_TRANSACTION = {
  data: {
    sessionKey: "aml-123",
    level: "very_high",
    status: "Success",
    customer: {
      score: 10,
      level: "very_high",
      signals: [
        {
          key: "adverseMediaLevel",
          value: "low",
        },
        {
          key: "amlRiskLevel",
          value: "high",
        },
        {
          key: "bankLevel",
          value: "low",
        },
        {
          key: "emailDomainLevel",
          value: "low",
        },
        {
          key: "emailLevel",
          value: "low",
        },
        {
          key: "nsfLevel",
          value: "low",
          reasonCodes: ["D"],
        },
        {
          key: "pepLevel",
          value: "high",
        },
        {
          key: "phoneLevel",
          value: "low",
        },
        {
          key: "sanctionLevel",
          value: "high",
        },
        {
          key: "taxIdLevel",
          value: "",
          reasonCodes: ["HST"],
        },
        {
          key: "cryptoAddressLevel",
          value: "high",
        },
      ],
    },
  },
};

export const FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE: DocumentVerificationSardineResponse = {
  verificationId: "fake-verification-1234",
  status: SardineDocumentProcessingStatus.COMPLETE,
  documentData: {
    type: "fake-type",
    number: "1234567890",
    dateOfBirth: "1960-08-07",
    dateOfIssue: "2010-11-02",
    dateOfExpiry: "2023-12-12",
    issuingCountry: "USA",
    firstName: "Fake",
    middleName: "",
    lastName: "User",
    gender: "Male",
    address: "Fake Address",
  },
  verification: {
    riskLevel: SardineRiskLevels.LOW,
    forgeryLevel: SardineRiskLevels.LOW,
    documentMatchLevel: SardineRiskLevels.HIGH,
    imageQualityLevel: SardineRiskLevels.MEDIUM,
    faceMatchLevel: SardineRiskLevels.HIGH,
    reasonCodes: [],
  },
  errorCodes: [],
};

export const FAKE_DOCUMENT_VERIFICATION_FRAUDULENT_DOCUMENT_RESPONSE: DocumentVerificationSardineResponse = {
  verificationId: "fake-verification-1234",
  status: SardineDocumentProcessingStatus.COMPLETE,
  documentData: {
    type: "fake-type",
    number: "1234567890",
    dateOfBirth: "1960-08-07",
    dateOfIssue: "2010-11-02",
    dateOfExpiry: "2023-12-12",
    issuingCountry: "USA",
    firstName: "Fake",
    middleName: "",
    lastName: "User",
    gender: "Male",
    address: "Fake Address",
  },
  verification: {
    riskLevel: SardineRiskLevels.HIGH,
    forgeryLevel: SardineRiskLevels.HIGH,
    documentMatchLevel: SardineRiskLevels.MEDIUM,
    imageQualityLevel: SardineRiskLevels.MEDIUM,
    faceMatchLevel: SardineRiskLevels.LOW,
    reasonCodes: [],
  },
  errorCodes: [],
};

export const FAKE_DOCUMENT_VERIFICATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE: DocumentVerificationSardineResponse = {
  verificationId: "fake-verification-1234",
  status: SardineDocumentProcessingStatus.ERROR,
  documentData: {
    type: "fake-type",
    number: "1234567890",
    dateOfBirth: "1960-08-07",
    dateOfIssue: "2010-11-02",
    dateOfExpiry: "2023-12-12",
    issuingCountry: "USA",
    firstName: "Fake",
    middleName: "",
    lastName: "User",
    gender: "Male",
    address: "Fake Address",
  },
  verification: {
    riskLevel: SardineRiskLevels.HIGH,
    forgeryLevel: SardineRiskLevels.HIGH,
    documentMatchLevel: SardineRiskLevels.LOW,
    imageQualityLevel: SardineRiskLevels.LOW,
    faceMatchLevel: SardineRiskLevels.LOW,
    reasonCodes: [],
  },
  errorCodes: [DocumentVerificationErrorCodes.DOCUMENT_REQUIRES_RECAPTURE],
};

export const FAKE_KYC_CASE_NOTIFICATION_APPROVED: CaseNotificationWebhookRequest = {
  id: "fake-id",
  type: "fake-type",
  timestamp: "fake-timestamp",
  data: {
    action: {
      source: "fake-source",
      user_email: "fake+email@noba.com",
      value: "approve",
    },
    case: {
      sessionKey: "fake-session-key",
      customerID: "fake-customer-id",
      status: "resolved",
      checkpoint: "ssn",
      transactionID: "fake-transaction",
    },
  },
};

export const FAKE_KYC_CASE_NOTIFICATION_REJECTED: CaseNotificationWebhookRequest = {
  id: "fake-id",
  type: "fake-type",
  timestamp: "fake-timestamp",
  data: {
    action: {
      source: "fake-source",
      user_email: "fake+email@noba.com",
      value: "decline",
    },
    case: {
      sessionKey: "fake-session-key",
      customerID: "fake-customer-id",
      status: "resolved",
      checkpoint: "ssn",
      transactionID: "fake-transaction",
    },
  },
};

export const FAKE_KYC_CASE_NOTIFICATION_IN_PROGRESS_STATE: CaseNotificationWebhookRequest = {
  id: "fake-id",
  type: "fake-type",
  timestamp: "fake-timestamp",
  data: {
    action: {
      source: "fake-source",
      user_email: "fake+user@noba.com",
      value: "",
    },
    case: {
      sessionKey: "fake-session-key",
      customerID: "fake-customer-id",
      status: "in-progress",
      checkpoint: "ssn",
      transactionID: "fake-transaction",
    },
  },
};

export const FAKE_DOCUMENT_SUBMISSION_RESPONSE = {
  data: {
    sessionKey: "5f06c08e-0793-11eb-adc1-0242ac120002",
    id: "string",
  },
};

export const FAKE_DEVICE_INFORMATION_RESPONSE: SardineDeviceInformationResponse = {
  id: "5d5e4327-af0f-4326-a91c-c02ec4be8dc8",
  level: SardineRiskLevels.LOW,
  attributes: {
    Browser: ["Chrome"],
    Model: [""],
    OS: ["Mac OS X"],
  },
  signals: [
    {
      key: "TrueOS",
      value: "Mac/iOS",
    },
    {
      key: "DeviceAgeHours",
      value: "5120",
    },
    {
      key: "TrueIP",
      value: "107.3.145.172",
    },
    {
      key: "VPN",
      value: "low",
    },
    {
      key: "Proxy",
      value: "low",
    },
    {
      key: "RemoteSoftwareLevel",
      value: "low",
    },
    {
      key: "OSAnomaly",
      value: "low",
    },
    {
      key: "Emulator",
      value: "false",
    },
    {
      key: "IpType",
      value: "Fixed Line ISP",
    },
  ],
  sessionKey: "apidoc00-0e3a-47b3-9fea-ec72a5example",
  fingerprint: "2473f843-13ab-40e0-abf9-32d5ffbf38a4",
  fingerprintConfidenceScore: 93,
  behaviorBiometricRiskLevel: "low",
  deviceReputation: "unknown",
  behaviorBiometrics: {
    numDistractionEvents: 0,
    fields: [
      {
        name: "p",
        numCopyPasteEvents: 0,
        numClipboardEvents: 0,
        numAutoFillEvents: 0,
        numExpertKeyEvents: 0,
        hesitationPercentage: 0,
        isLTM: true,
        timeSpendInMsEvents: [914],
      },
      {
        name: "u",
        numCopyPasteEvents: 0,
        numClipboardEvents: 0,
        numAutoFillEvents: 0,
        numExpertKeyEvents: 0,
        hesitationPercentage: 0,
        isLTM: true,
        timeSpendInMsEvents: [900],
      },
    ],
  },
  ipLocation: {
    city: "Palo Alto",
    region: "California",
    country: "US",
    latitude: "37.44",
    longitude: "-122.14",
  },
  gpsLocation: {
    city: "Palo Alto",
    region: "California",
    country: "US",
    latitude: "37.44",
    longitude: "-122.14",
    mockLevel: "high",
  },
};
