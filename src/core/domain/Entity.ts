import { nanoid } from "nanoid";
import Joi from "joi";
import { KeysRequired } from "../../modules/common/domain/Types";

// Rename to something better as now it doesn't just refer to version information
export type VersioningInfo = {
  version?: number;
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
};
export const versioningInfoJoiSchemaKeys: KeysRequired<VersioningInfo> = {
  version: Joi.number().optional(),
  createdTimestamp: Joi.date().optional(),
  updatedTimestamp: Joi.date().optional(),
};

export abstract class Entity<T extends VersioningInfo> {
  public readonly props: T;
  constructor(props: T) {
    this.props = props;
  }

  public get version() {
    return this.props.version;
  }

  public static getNewID(): string {
    return nanoid();
  }

  public static isEntity(v: any): v is Entity<any> {
    return v instanceof Entity;
  }
}
