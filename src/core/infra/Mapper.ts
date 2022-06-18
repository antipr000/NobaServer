export interface Mapper<T> {
  toDomain(t: any): T;
  toDTO(t: T, ...any): any;
}
