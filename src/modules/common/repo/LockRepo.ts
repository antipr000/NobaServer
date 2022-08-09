import { ObjectType } from "../domain/ObjectType";

export interface LockRepo {
  acquireLockForKey(key: string, objectType: ObjectType): Promise<string | null>;
  releaseLockForKey(key: string, objectType: ObjectType): Promise<void>;
}
