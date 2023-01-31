import { randomUUID } from "crypto"; // built-in node crypto, not from npm
import Joi from "joi";
import { KeysRequired } from "../../modules/common/domain/Types";

// Rename to something better as now it doesn't just refer to version information
export type BaseProps = {
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
};
export const basePropsJoiSchemaKeys: KeysRequired<BaseProps> = {
  createdTimestamp: Joi.date().optional(),
  updatedTimestamp: Joi.date().optional(),
};

export abstract class Entity<T extends BaseProps> {
  public readonly props: T;
  constructor(props: T) {
    this.props = props;
  }

  // TODO(CRYPTO-551): Remove this method completely
  public static getNewID(): string {
    return randomUUID();
  }

  public static isEntity(v: any): v is Entity<any> {
    return v instanceof Entity;
  }
}
