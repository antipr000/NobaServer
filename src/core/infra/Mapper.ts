export interface Mapper<T> {
  toDomain (t: any): T;
  toDTO (t: T, ...any): any;
  toPersistence (t: any, options:any): any;
}