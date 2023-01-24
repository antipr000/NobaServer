import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterEmployerRequestDTO {
  @ApiProperty()
  name: string;

  @ApiProperty()
  logoURI: string;

  @ApiProperty()
  referralID: string;

  @ApiProperty()
  bubbleID: string;

  @ApiPropertyOptional()
  leadDays?: number;

  @ApiPropertyOptional()
  paymentSchedules?: number[];
}
