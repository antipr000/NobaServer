
import { Entity, VersioningInfo } from "./Entity";

export abstract class AggregateRoot<T extends VersioningInfo> extends Entity<T> {
  //TODO add domain events
}