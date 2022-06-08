
export enum KybStatus {
    VERIFIED = "VERIFIED",
    NOT_VERIFIED = "NOT_VERIFIED"
}

export type KybStatusInfo = {
    kybStatus: KybStatus;
    kybProvider: string;
}