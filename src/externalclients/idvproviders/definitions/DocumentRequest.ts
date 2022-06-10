export enum DocumentTypes {
    DrivingLicence = "DrivingLicence",
    IdentityCard = "IdentityCard",
    Passport = "Passport",
    ResidentPermit = "ResidentPermit"
};

export type DocumentRequest = {
    documentFrontImage: string;
    documentBackImage?: string;
    documentType: DocumentTypes;
    countryCode: string;
};