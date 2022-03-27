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
    Country: String;
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

export type TruliooRequest = {
    AcceptTruliooTermsAndConditions: boolean;
    CallBackUrl?: string;
    ConfigurationName: string;
    CountryCode: string;
    DataFields: DataFields;
};