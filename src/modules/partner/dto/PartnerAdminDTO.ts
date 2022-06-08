import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PartnerAdminDTO {
    @ApiProperty()
    _id: string;

    @ApiPropertyOptional()
    name: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    partnerId: string;

    @ApiProperty()
    role: string;
}