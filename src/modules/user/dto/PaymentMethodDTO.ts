import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../domain/Types';

export class PaymentMethodDTO  { 

    @ApiProperty() 
    paymentMethodId: string;

    @ApiProperty({enum: Object.values(PaymentMethodType)})
    paymentMethodType: string;                

    //send masked number only to client
    @ApiPropertyOptional()
    cardNumber?: string;
} 


export class PaymentMethodsDTO {
    @ApiProperty({type: [PaymentMethodDTO]})
    paymentMethods: PaymentMethodDTO[];
}