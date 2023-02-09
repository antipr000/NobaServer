import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { HealthCheckStatus } from "../../../core/domain/HealthCheckTypes";

export class HealthCheckResponseDTO {
  @ApiProperty({ enum: HealthCheckStatus })
  serverStatus: HealthCheckStatus;

  @ApiPropertyOptional({ enum: HealthCheckStatus })
  sardineStatus?: HealthCheckStatus;

  @ApiPropertyOptional({ enum: HealthCheckStatus })
  monoStatus?: HealthCheckStatus;

  @ApiPropertyOptional({ enum: HealthCheckStatus })
  circleStatus?: HealthCheckStatus;

  @ApiPropertyOptional({ enum: HealthCheckStatus })
  temporalStatus?: HealthCheckStatus;
}
