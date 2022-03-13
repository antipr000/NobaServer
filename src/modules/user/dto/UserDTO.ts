import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { UserProps } from '../domain/User';

export class UserDTO implements Partial<UserProps> { 
    @ApiProperty()
    id: string;
    
    @ApiProperty()
    version?: number;

    createdAt?: string;
    updatedAt?: string;                 

    @ApiPropertyOptional()
    name?: string;

    @ApiProperty()
    email: string;

 
} 