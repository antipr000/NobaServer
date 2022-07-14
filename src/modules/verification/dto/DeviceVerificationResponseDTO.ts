import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  BehaviorBiometricsFields,
  DeviceAttributes,
  DeviceBehaviorBiometrics,
  DeviceGpsLocation,
  DeviceIpLocation,
  SardineDeviceInformationResponse,
  SardineRiskLevels,
  Signals,
} from "../integrations/SardineTypeDefinitions";

class DeviceAttributesDTO implements DeviceAttributes {
  @ApiProperty()
  Browser: string[];

  @ApiProperty()
  Model: string[];

  @ApiProperty()
  OS: string[];
}

class SignalsDTO implements Signals {
  @ApiProperty()
  key: string;

  @ApiProperty()
  value: string;
}

class DeviceBehaviorBiometricsDTO implements DeviceBehaviorBiometrics {
  @ApiPropertyOptional()
  numDistractionEvents?: number;

  @ApiProperty()
  fields: BehaviorBiometricsFields[];
}

class DeviceGpsLocationDTO implements DeviceGpsLocation {
  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  latitude?: string;

  @ApiPropertyOptional()
  longitude?: string;

  @ApiPropertyOptional()
  mockLevel?: string;
}

class DeviceIpLocationDTO implements DeviceIpLocation {
  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  latitude?: string;

  @ApiPropertyOptional()
  longitude?: string;
}

export class DeviceVerificationResponseDTO implements SardineDeviceInformationResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SardineRiskLevels })
  level: SardineRiskLevels;

  @ApiPropertyOptional()
  attributes?: DeviceAttributesDTO;

  @ApiPropertyOptional()
  signals?: SignalsDTO[];

  @ApiProperty()
  sessionKey: string;

  @ApiPropertyOptional()
  fingerprint?: string;

  @ApiPropertyOptional()
  fingerprintConfidenceScore?: number;

  @ApiPropertyOptional()
  behaviorBiometricRiskLevel?: string;

  @ApiPropertyOptional()
  deviceReputation?: string;

  @ApiPropertyOptional()
  behaviorBiometrics?: DeviceBehaviorBiometricsDTO;

  @ApiPropertyOptional()
  ipLocation?: DeviceIpLocationDTO;

  @ApiPropertyOptional()
  gpsLocation?: DeviceGpsLocationDTO;
}
