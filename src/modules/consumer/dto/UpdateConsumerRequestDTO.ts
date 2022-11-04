import { ApiPropertyOptional } from "@nestjs/swagger";
import { Address } from "../domain/Address";
import { ConsumerProps } from "../domain/Consumer";

export class UpdateConsumerRequestDTO implements Partial<ConsumerProps> {
  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  address?: Address;

  @ApiPropertyOptional()
  dateOfBirth?: string;
}
