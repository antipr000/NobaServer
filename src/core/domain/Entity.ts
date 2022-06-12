import { nanoid } from "nanoid";
import * as Joi from "joi";
import { KeysRequired } from "../../modules/common/domain/Types";
import { validISODateTimeStringFilter } from "../utils/DateUtils";

export type VersioningInfo = {
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};
export const versioningInfoJoiSchemaKeys: KeysRequired<VersioningInfo> = {
  version: Joi.number().optional(),
  createdAt: Joi.custom(validISODateTimeStringFilter).optional(),
  updatedAt: Joi.custom(validISODateTimeStringFilter).optional(),
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
