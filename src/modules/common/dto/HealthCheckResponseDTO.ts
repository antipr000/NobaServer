import { ApiProperty } from "@nestjs/swagger";

export enum HealthStatus {
  OK = "OK",
  SERVICE_DOWN = "SERVICE_DOWN",
}

export class HealthCheckResponseDTO {
  @ApiProperty({ enum: HealthStatus })
  status: HealthStatus;
}
