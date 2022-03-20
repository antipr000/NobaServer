import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTransactionDTO {
    @ApiProperty()
    paymentMethodId: string;
    
    @ApiProperty()
    tradePair: string;

    @ApiProperty()
    leg1Amount: number;

    @ApiProperty()
    leg2Amount: number;

    @ApiPropertyOptional()
    sourceWalletAdress?: string;

    @ApiPropertyOptional()
    destinationWalletAdress?: string; 
}