import { Consumer } from "./consumer";

export class Circle {
  id: string;

  createdTimestamp?: Date;

  updatedTimestamp?: Date;

  walletID: string;

  consumer: Consumer;

  consumerID: string;
}
