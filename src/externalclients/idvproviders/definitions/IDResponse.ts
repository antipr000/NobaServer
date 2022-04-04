export enum Status {
    OK = "OK",
    FAILED = "FAILED",
    PENDING = "PENDING"
};

export type IDResponse = {
    status: Status
};