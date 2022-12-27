export type BaseExceptionConstructor<T> = {
  message: string;
  errorCode?: T;
  error?: any;
};

export class BaseException<T> extends Error {
  accessor errorCode: T;
  accessor error: any;

  constructor(params: BaseExceptionConstructor<T>) {
    super(params.message);
    this.errorCode = params.errorCode;
    this.error = params.error;
  }
}
