import { ApiProperty } from "@nestjs/swagger";

export class RequestEmployerDTO {
  @ApiProperty({ description: "Email address of human resources at the employer" })
  email: string;
}
