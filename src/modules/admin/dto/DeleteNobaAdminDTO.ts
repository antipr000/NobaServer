import { ApiProperty } from '@nestjs/swagger';
import { AdminProps } from '../domain/Admin';

export class DeleteNobaAdminDTO implements Partial<AdminProps> {
  @ApiProperty()
  _id?: string
} 