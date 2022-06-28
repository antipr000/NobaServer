import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentTypes } from "../domain/DocumentTypes";
import { Express } from "express";
// eslint-disable-next-line unused-imports/no-unused-imports
import { Multer } from "multer";

export class DocVerificationRequestDTO {
  @ApiProperty({
    enum: DocumentTypes,
    description: "Supported values: passport, national_identity_card, driver_license, other, unknown",
  })
  documentType: DocumentTypes;
}

export class DocumentsFileUploadRequestDTO {
  @ApiProperty()
  frontImage: Express.Multer.File[];

  @ApiPropertyOptional()
  backImage?: Express.Multer.File[];

  @ApiPropertyOptional()
  photoImage?: Express.Multer.File[];
}
