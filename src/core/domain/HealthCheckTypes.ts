export enum HealthCheckStatus {
  OK = "OK",
  UNAVAILABLE = "UNAVAILABLE",
}

export class HealthCheckResponse {
  status: HealthCheckStatus;
}
