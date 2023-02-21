/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type HealthCheckResponseDTO = {
  serverStatus: "OK" | "UNAVAILABLE";
  sardineStatus?: "OK" | "UNAVAILABLE";
  monoStatus?: "OK" | "UNAVAILABLE";
  circleStatus?: "OK" | "UNAVAILABLE";
  temporalStatus?: "OK" | "UNAVAILABLE";
};
