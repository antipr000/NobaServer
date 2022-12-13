import { ApiPropertyOptional } from "@nestjs/swagger";
import { Consumer as ConsumerProps } from "../../../generated/domain/consumer";

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
