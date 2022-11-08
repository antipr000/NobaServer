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

export class ConsumerBalanceDTO {
  @ApiProperty()
  asset: string;

  @ApiProperty()
  balance: string;

  @ApiPropertyOptional()
  accountType?: string;

  @ApiPropertyOptional()
  accountID?: string;

  @ApiPropertyOptional()
  lastUpdate?: number;

  @ApiPropertyOptional()
  name?: string;
}
