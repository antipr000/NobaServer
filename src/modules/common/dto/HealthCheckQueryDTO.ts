import { ApiProperty } from "@nestjs/swagger";

export enum ALLOWED_DEPTH {
  SHALLOW = "SHALLOW",
  DEEP = "DEEP",
}

export class HealthCheckQueryDTO {
  @ApiProperty({ enum: ALLOWED_DEPTH })
  depth: ALLOWED_DEPTH;
}
