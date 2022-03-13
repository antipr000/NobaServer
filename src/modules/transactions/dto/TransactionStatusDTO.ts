import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionStatus } from "../domain/Types";

export class TransactionStatusDTO {
    @ApiProperty()
    id: string;
    

    @ApiProperty({enum: Object.values(TransactionStatus)})
    status: TransactionStatus;

    @ApiPropertyOptional() 
    statusMessage?: string;

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