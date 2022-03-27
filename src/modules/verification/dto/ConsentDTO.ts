import { ApiProperty } from '@nestjs/swagger';
import { Consent } from '../../../externalclients/idvproviders/definitions';

export class ConsentDTO implements Consent {
    @ApiProperty()
    name: string;

    @ApiProperty()
    message: string;
}