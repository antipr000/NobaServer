import { ApiPropertyOptional } from "@nestjs/swagger";
import { ConsumerProps } from "../domain/Consumer";

export class UpdateConsumerRequestDTO implements Partial<ConsumerProps> {
  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  handle?: string;
}
