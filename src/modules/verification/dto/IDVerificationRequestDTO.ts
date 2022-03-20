import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NationalID, DOB, IDRequest } from '../../../externalclients/idvproviders/definitions';

class NationalIDDTO implements NationalID {
    @ApiProperty()
    type: string;

    @ApiProperty()
    number: string;

}

class DOBDTO implements DOB {
    @ApiProperty()
    date: number;

    @ApiProperty()
    month: number;

    @ApiProperty()
    year: number;

}

export class IDVerificationRequestDTO implements IDRequest {
    @ApiProperty()
    firstName: string;

    @ApiProperty()
    lastName: string;

    @ApiProperty()
    dateOfBirth: DOBDTO;

    @ApiProperty()
    streetName: string;

    @ApiProperty()
    city: string;

    @ApiProperty()
    state: string;

    @ApiProperty()
    countryCode: string;

    @ApiProperty()
    postalCode: string;

    @ApiProperty()
    nationalID: NationalIDDTO;
}