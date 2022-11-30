import { LimitConfiguration } from "../domain/LimitConfiguration";

export interface ILimitConfigurationRepo {
  getLimitConfig(id): Promise<LimitConfiguration>;
  getAllLimitConfigs(): Promise<Array<LimitConfiguration>>;
  addLimitConfig(limitConfig: LimitConfiguration): Promise<LimitConfiguration>;
}
