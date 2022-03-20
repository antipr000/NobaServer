import { ApiProperty } from '@nestjs/swagger';
import { Status } from '../../../externalclients/idvproviders/definitions';

export class VerificationResultDTO {
    @ApiProperty({ enum: Status })
    status: Status;
};