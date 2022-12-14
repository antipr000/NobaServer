import { OTP } from "../domain/OTP";
import { Mapper } from "../../../core/infra/Mapper";

export class OTPMapper implements Mapper<OTP> {
  toDTO(t: OTP, ...any: any[]) {
    throw new Error("Method not implemented");
  }

  toDomain(t: any): OTP {
    return OTP.createOtp(t);
  }
}
