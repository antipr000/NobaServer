export enum UserStatus {
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
}

export class PomeloUser {
  id: string;
  status: UserStatus;
}
