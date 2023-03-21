export enum CardType {
  PHYSICAL = "PHYSICAL",
  VIRTUAL = "VIRTUAL",
}

export enum CardStatus {
  BLOCKED = "BLOCKED",
  DISABLED = "DISABLED",
  ACTIVE = "ACTIVE",
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
