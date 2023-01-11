import { LimitProfile } from "../domain/LimitProfile";

export interface ILimitProfileRepo {
  getProfile(id: string): Promise<LimitProfile>;
  addProfile(limitProfile: LimitProfile): Promise<LimitProfile>;
}
