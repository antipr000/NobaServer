import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTransactionDTO {
    @ApiProperty()
    paymentMethodId: string;
    
    @ApiProperty()
    leg1: string;

    @ApiProperty()
    leg2: string;

    @ApiProperty()
    leg1Amount: number;

    @ApiProperty()
    leg2Amount: number;

    @ApiPropertyOptional()
    sourceWalletAdress?: string;

    @ApiPropertyOptional()
    destinationWalletAdress?: string; 
}