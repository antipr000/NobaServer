import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentRequest, DocumentTypes } from "src/externalclients/idvproviders/definitions";

export class DocVerificationRequestDTO implements DocumentRequest {
    @ApiProperty()
    documentFrontImage: string;

    @ApiPropertyOptional()
    documentBackImage?: string;

    @ApiProperty()
    livePhoto: string;

    @ApiProperty({ enum: DocumentTypes })
    documentType: DocumentTypes;

};