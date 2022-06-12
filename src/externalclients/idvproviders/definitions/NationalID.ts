export enum NationalIDTypes {
  NationalID = "NationalID",
  HealthID = "HealthID",
  SocialService = "SocialService",
  Passport = "Passport",
  DriverLicence = "DriverLicence",
}

export type NationalID = {
  type: NationalIDTypes;
  number: string;
  mrz1?: string;
  mrz2?: string;
  dayOfExpiry?: number;
  monthOfExpiry?: number;
  yearOfExpiry?: number;
  state?: string;
};
