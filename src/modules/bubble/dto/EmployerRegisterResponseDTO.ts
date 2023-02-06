import { ApiProperty } from "@nestjs/swagger";

export class EmployerRegisterResponseDTO {
  @ApiProperty()
  nobaEmployerID: string;
}
