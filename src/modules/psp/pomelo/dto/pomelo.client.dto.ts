import { CardStatus, CardType } from "../domain/PomeloCard";
import { UserStatus } from "../domain/PomeloUser";

export class CreateUserRequest {
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

export class UpdateUserRequest {
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
  status?: UserStatus;
  status_reason?: string;
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
  user_id: string;
  card_type: CardType;
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

export class UpdateCardRequest {
  status?: CardStatus;
  status_reason?: CardStatusReason;
  pin?: string;
}
