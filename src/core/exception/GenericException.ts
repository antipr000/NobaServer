export type GenericExceptionConstructor<T> = {
  message: string;
  errorCode?: T;
  error?: any;
};

export class GenericException<T> extends Error {
	accessor errorCode: T;
	accessor error: any;

  constructor(params:GenericExceptionConstructor<T>) {
    super(params.message);
		this.errorCode = params.errorCode
		this.error = params.error
  }
}
