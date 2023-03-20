export class CreateUserRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  consumerID: string;
  gender: string;
  identificationType: string;
  identificationNumber: string;
  address: {
    streetName: string;
    pinCode: string;
    city: string;
    region: string;
  };
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
}

export class UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phoneNumber?: string;
  gender?: string;
  identificationType?: string;
  identificationNumber?: string;
  address?: {
    streetName: string;
    pinCode: string;
    city: string;
    region: string;
    country: string;
  };
  status?: UserStatus;
  statusReason?: string;
}

export enum CardType {
  PHYSICAL = "PHYSICAL",
  VIRTUAL = "VIRTUAL",
}

export enum CardStatus {
  BLOCKED = "BLOCKED",
  DISABLED = "DISABLED",
  ACTIVE = "ACTIVE",
}

export enum CardStatusReason {
  CLIENT_INTERNAL_REASON = "CLIENT_INTERNAL_REASON",
  USER_INTERNAL_REASON = "USER_INTERNAL_REASON",
  LOST = "LOST",
  STOLEN = "STOLEN",
  BROKEN = "BROKEN",
  UPGRADE = "UPGRADE",
}

export class CreateCardRequest {
  userID: string;
  cardType: CardType;
  address?: {
    streetName: string;
    streetNumber: string;
    floor: string;
    apartment: string;
    city: string;
    region: string;
    country: string;
    zipCode: string;
    neighborhood: string;
  };
  previousCardID?: string;
}

export class PomeloCard {
  id: string;
  cardType: CardType;
  productType: string;
  status: CardStatus;
  shipmentID: string;
  userID: string;
  startDate: string;
  lastFour: string;
  provider: string;
}

export class UpdateCardRequest {
  status?: CardStatus;
  statusReason?: CardStatusReason;
  pin?: string;
}
