import { ApiPropertyOptional } from "@nestjs/swagger";

export enum ALLOWED_DEPTH {
  SHALLOW = "SHALLOW",
  DEEP = "DEEP",
}

export class HealthCheckQueryDTO {
  @ApiPropertyOptional({ enum: ALLOWED_DEPTH })
  depth?: ALLOWED_DEPTH = ALLOWED_DEPTH.SHALLOW;
}
