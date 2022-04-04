import { Otp } from "../domain/Otp";
import { Mapper } from '../../../core/infra/Mapper';

export class OtpMapper  implements Mapper<Otp>{
    
   
    toPersistence(t: any, options: any) {
        throw new Error("Method not implemented.");
    }

    toDTO(t: Otp, ...any: any[]) {
        throw new Error("Method not implemented");
    }

    toDomain(t: any): Otp {
        return Otp.createOtp(t); 
    }

}