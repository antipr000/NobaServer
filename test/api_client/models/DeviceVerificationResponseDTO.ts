/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { DeviceAttributesDTO } from "./DeviceAttributesDTO";
import type { DeviceBehaviorBiometricsDTO } from "./DeviceBehaviorBiometricsDTO";
import type { DeviceGpsLocationDTO } from "./DeviceGpsLocationDTO";
import type { DeviceIpLocationDTO } from "./DeviceIpLocationDTO";

export type DeviceVerificationResponseDTO = {
  id: string;
  level: "very_high" | "high" | "medium" | "low";
  attributes?: DeviceAttributesDTO;
  signals?: Array<string>;
  sessionKey: string;
  fingerprint?: string;
  fingerprintConfidenceScore?: number;
  behaviorBiometricRiskLevel?: string;
  deviceReputation?: string;
  behaviorBiometrics?: DeviceBehaviorBiometricsDTO;
  ipLocation?: DeviceIpLocationDTO;
  gpsLocation?: DeviceGpsLocationDTO;
};
