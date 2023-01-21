import { ApiPropertyOptional } from "@nestjs/swagger";

export class OptionalLimitQueryDTO {
  // TODO(CRYPTO-393): Mark it as required
  @ApiPropertyOptional()
  limit: number;
}
