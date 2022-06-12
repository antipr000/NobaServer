import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserProps } from "../domain/User";

export class UpdateUserRequestDTO implements Partial<UserProps> {
  @ApiPropertyOptional()
  name?: string;
}
