import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTransactionDTO {
    @ApiProperty()
    paymentMethodId: string;
    
    @ApiProperty()
    tradePair: string;

    @ApiProperty()
    leg1Amount: string;

    @ApiProperty()
    leg2Amount: string;

    @ApiPropertyOptional()
    sourceWalletAdress?: string;

    @ApiPropertyOptional()
    destinationWalletAdress?: string; 
}