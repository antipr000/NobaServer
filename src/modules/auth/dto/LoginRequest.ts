import { ApiPropertyOptional } from "@nestjs/swagger";

export class LoginRequestDTO {
  @ApiPropertyOptional({ description: "Email or phone value to identify the user" })
  emailOrPhone?: string;

  @ApiPropertyOptional({ description: "Whether or not to auto-create an account if not present" })
  autoCreate?: boolean;
}

export class AdminLoginRequestDTO {
  @ApiPropertyOptional({ description: "Email or phone value to identify the user" })
  emailOrPhone?: string;
}
