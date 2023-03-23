export enum CardStatus {
  BLOCKED = "BLOCKED",
  ACTIVE = "ACTIVE",
}

export class Card {
  id: string;
  clientID: string;
  consumerID: string;
  status: CardStatus;
}
