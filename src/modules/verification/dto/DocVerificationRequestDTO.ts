import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentTypes } from "../../../externalclients/idvproviders/definitions";

export class DocVerificationRequestDTO {
    @ApiProperty({ enum: DocumentTypes })
    documentType: DocumentTypes;

    @ApiProperty()
    countryCode: string;

    @ApiProperty()
    documentFrontImage: string;

    @ApiPropertyOptional()
    documentBackImage: string;
};
