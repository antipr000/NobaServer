import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterWithEmployerDTO {
  @ApiProperty()
  employerID: string;

  @ApiProperty()
  allocationAmountInPesos: number;
}
