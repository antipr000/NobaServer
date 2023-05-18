export enum MetaEventName {
  COMPLETE_REGISTRATION = "CompleteRegistration",
}

export class MetaEvent {
  eventName: MetaEventName;
  userData: {
    id: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    country?: string;
  };
}
