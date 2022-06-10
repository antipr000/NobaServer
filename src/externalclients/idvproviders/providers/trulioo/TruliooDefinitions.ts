type PersonInfo = {
    FirstGivenName: string;
    FirstSurName: string;
    DayOfBirth: number;
    MonthOfBirth: number;
    YearOfBirth: number;
};

type Address = {
    StreetName: string;
    City: string;
    PostalCode: string;
    Country: string;
    StateProvinceCode: string;
};

type NationalId = {
    Number: string;
    Type: string;
};

type Passport = {
    Mrz1: string;
    Mrz2: string;
    Number: string;
    DayOfExpiry: number;
    MonthOfExpiry: number;
    YearOfExpiry: number;
}

type DriverLicence = {
    Number: string;
    State: string;
    DayOfExpiry: number;
    MonthOfExpiry: number;
    YearOfExpiry: number;
}

type DataFields = {
    PersonInfo: PersonInfo;
    Location: Address;
    NationalIds?: NationalId[];
    Passport?: Passport;
    DriverLicence?: DriverLicence;
};

type Document = {
    DocumentFrontImage: string;
    DocumentBackImage: string;
    DocumentType: string;
};

type DocumentDataFields = {
    Document: Document;
};

export enum TransactionStatus {
    InProgress = "InProgress",
    Completed = "Completed",
    Failed = "Failed",
    Canceled = "Canceled",
    TimeoutCanceled = "TimeoutCanceled"
};

export type TruliooRequest = {
    AcceptTruliooTermsAndConditions: boolean;
    CallBackUrl?: string;
    ConfigurationName: string;
    CountryCode: string;
    DataFields: DataFields;
};

export type TruliooDocRequest = {
    AcceptTruliooTermsAndConditions: boolean;
    CallBackUrl?: string;
    ConfigurationName: string;
    CountryCode: string;
    DataFields: DocumentDataFields;
}

export type TruliooDocResponse = {
    TransactionID: string;
    UploadedDt: string;
    CountryCode: string;
    ProductName: string;
    Record: {
        RecordStatus: string;
    }
};

export type TransactionStatusResponse = {
    TransactionId: string;
    TransactionRecordId: string;
    Status: TransactionStatus;
    UploadedDt: string;
    IsTimedOut: boolean;
};