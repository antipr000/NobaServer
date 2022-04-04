import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { UserProps } from '../domain/User';

export class UserDTO implements Partial<UserProps> { 
    @ApiProperty()
    _id: string;
    
    @ApiProperty()
    version?: number;

    createdAt?: string;
    updatedAt?: string;                 

    @ApiPropertyOptional()
    name?: string;

    @ApiProperty()
    email: string;

    @ApiPropertyOptional()
    phone?: string;

    @ApiPropertyOptional()
    isEmailVerified?: boolean;

    @ApiPropertyOptional()
    idVerified?: boolean;

    @ApiPropertyOptional()
    documentVerified?: boolean;
} 