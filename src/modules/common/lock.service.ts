import { Inject, Injectable } from "@nestjs/common";
import { LockRepo } from "./repo/LockRepo";
import { ObjectType } from "./domain/ObjectType";

@Injectable()
export class LockService {
  @Inject("LockRepo") lockRepo: LockRepo;

  async acquireLockForKey(key: string, objectType: ObjectType): Promise<string | null> {
    return await this.lockRepo.acquireLockForKey(key, objectType);
  }

  async releaseLockForKey(key: string, objectType: ObjectType): Promise<void> {
    await this.lockRepo.releaseLockForKey(key, objectType);
  }
}
