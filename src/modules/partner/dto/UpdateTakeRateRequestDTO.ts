import { ApiProperty } from "@nestjs/swagger";

export class UpdateTakeRateRequestDTO {
  @ApiProperty()
  takeRate: number;
}
