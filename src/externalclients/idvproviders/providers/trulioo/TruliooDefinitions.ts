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

type DataFields = {
    PersonInfo: PersonInfo;
    Location: Address;
    NationalIds: NationalId[];
};

export type TruliooRequest = {
    AcceptTruliooTermsAndConditions: boolean;
    CallBackUrl?: string;
    ConfigurationName: string;
    CountryCode: string;
    DataFields: DataFields;
};