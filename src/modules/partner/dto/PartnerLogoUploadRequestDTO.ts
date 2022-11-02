import { ApiPropertyOptional } from "@nestjs/swagger";

export class PartnerLogoUploadRequestDTO {
  @ApiPropertyOptional()
  logoSmall?: Express.Multer.File[];

  @ApiPropertyOptional()
  logo?: Express.Multer.File[];
}
