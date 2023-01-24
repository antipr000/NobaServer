import { ApiPropertyOptional } from "@nestjs/swagger";

export class OptionalLimitQueryDTO {
  @ApiPropertyOptional()
  limit: number;
}
