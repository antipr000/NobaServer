import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PeriodLimit {
  @ApiProperty()
  max: number;

  @ApiProperty()
  used: number;

  @ApiProperty()
  period: number;
}

export class ConsumerLimitsDTO {
  @ApiProperty()
  minTransaction: number;

  @ApiProperty()
  maxTransaction: number;

  @ApiProperty({ type: PeriodLimit })
  monthly: PeriodLimit;

  @ApiPropertyOptional({ type: PeriodLimit })
  weekly?: PeriodLimit;

  @ApiPropertyOptional({ type: PeriodLimit })
  daily?: PeriodLimit;
}
