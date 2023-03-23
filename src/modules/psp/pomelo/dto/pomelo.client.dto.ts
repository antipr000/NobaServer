import { NobaCardStatus, NobaCardType } from "../../card/domain/NobaCard";

export class ClientCreateUserRequest {
  name: string;
  surname: string;
  identification_type: string;
  identification_value: string;
  birthdate: string;
  gender: string;
  email: string;
  phone: string;
  operation_country: string;
  legal_address: {
    street_name: string;
    zip_code: string;
    city: string;
    region: string;
    country: string;
  };
}

export class ClientUpdateUserRequest {
  name?: string;
  surname?: string;
  birthdate?: string;
  email?: string;
  phone?: string;
  gender?: string;
  identification_type?: string;
  identification_value?: string;
  legal_address?: {
    street_name: string;
    zip_code: string;
    city: string;
    region: string;
    country: string;
  };
  status?: ClientUserStatus;
  status_reason?: string;
}

export enum ClientCardStatusReason {
  CLIENT_INTERNAL_REASON = "CLIENT_INTERNAL_REASON",
  USER_INTERNAL_REASON = "USER_INTERNAL_REASON",
  LOST = "LOST",
  STOLEN = "STOLEN",
  BROKEN = "BROKEN",
  UPGRADE = "UPGRADE",
}

export class ClientCreateCardRequest {
  user_id: string;
  card_type: NobaCardType;
  address?: {
    street_name: string;
    street_number: string;
    floor: string;
    apartment: string;
    city: string;
    region: string;
    country: string;
    zip_code: string;
    neighborhood: string;
  };
  previous_card_id?: string;
}

export class ClientUpdateCardRequest {
  status?: NobaCardStatus;
  status_reason?: ClientCardStatusReason;
  pin?: string;
}

export class ClientPomeloUser {
  id: string;
  status: ClientUserStatus;
}

export enum ClientUserStatus {
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
}

export class ClientPomeloCard {
  id: string;
  cardType: NobaCardType;
  productType: string;
  status: NobaCardStatus;
  shipmentID: string;
  userID: string;
  startDate: string;
  lastFour: string;
  provider: string;
}
