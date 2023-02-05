import { ApiProperty } from "@nestjs/swagger";

export class DocumentVerificationResponseDTO {
  @ApiProperty()
  documentCheckReference: string;
}
