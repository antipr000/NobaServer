export interface Mapper<T> {
  toDomain(t: any): T;
  toDTO(t: T, ...arg1: any[]): any;
}
