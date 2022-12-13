import { Consumer } from "./consumer";

export class Address {
  id: number;

  streetLine1: string;

  streetLine2?: string;

  city: string;

  countryCode: string;

  regionCode: string;

  postalCode: string;

  consumer: Consumer;

  consumerID: string;
}
