import { Entity, BaseProps } from "./Entity";

export abstract class AggregateRoot<T extends BaseProps> extends Entity<T> {
  //TODO add domain events
}
