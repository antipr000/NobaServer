import { Inject, Injectable, Logger } from "@nestjs/common";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { LockRepo } from "./LockRepo";
import { Lock, LockProps } from "../domain/Lock";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { ObjectType } from "../domain/ObjectType";

@Injectable()
export class MongoDBLockRepo implements LockRepo {
  @Inject()
  private readonly dbProvider: DBProvider;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  /**
   * Method to acquire lock on a key
   * We create an entry for the key using it as id
   * So only for when some worker acquires a lock it gets created
   * Simultaneous create requests for same key will fail
   */
  async acquireLockForKey(key: string, objectType: ObjectType): Promise<string | null> {
    try {
      const lockModel = await this.dbProvider.getLockModel();
      // TODO: Try getting lock and check for timeout.
      const lock = Lock.createLockObject({
        key: key,
        acquireLockTimestamp: new Date().valueOf(),
        objectType: objectType,
      });
      const result = await lockModel.create(lock.props);
      const lockProps: LockProps = convertDBResponseToJsObject(result);
      return lockProps._id;
    } catch (e) {
      return null;
    }
  }

  /**
   * Method to release lock for a key
   * It deletes the key from the database
   */
  async releaseLockForKey(key: string, objectType: ObjectType): Promise<void> {
    try {
      const lockModel = await this.dbProvider.getLockModel();
      await lockModel.findOneAndDelete({ key: key, objectType: objectType });
    } catch (e) {
      // pass
    }
  }
}
