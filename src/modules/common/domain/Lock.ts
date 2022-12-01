import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, BaseProps, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";

export interface LockProps extends BaseProps {
  _id: string;
  key: string;
  objectType: string;
  acquireLockTimestamp?: number;
}

export const lockKeys: KeysRequired<LockProps> = {
  ...basePropsJoiSchemaKeys,
  _id: Joi.string().required(),
  key: Joi.string().required(),
  objectType: Joi.string().required(),
  acquireLockTimestamp: Joi.number().optional(),
};

export const lockJoiSchema = Joi.object(lockKeys).options({ allowUnknown: true });

export class Lock extends AggregateRoot<LockProps> {
  private constructor(lockProps: LockProps) {
    super(lockProps);
  }

  public static createLockObject(lockProps: Partial<LockProps>): Lock {
    if (!lockProps._id) lockProps._id = Entity.getNewID();
    return new Lock(Joi.attempt(lockProps, lockJoiSchema));
  }
}
