import { ApiProperty } from '@nestjs/swagger';
import { AdminProps } from '../domain/Admin';

export class UpdateNobaAdminDTO implements Partial<AdminProps> {
  @ApiProperty()
  _id: string

  @ApiProperty()
  role: string
} 