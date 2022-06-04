import { ApiProperty } from '@nestjs/swagger';
import { AdminProps } from '../domain/Admin';

export class UpdateNobaAdminDTO implements Partial<AdminProps> {
  @ApiProperty()
  email: string

  @ApiProperty()
  role: string
} 