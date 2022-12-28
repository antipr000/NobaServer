export interface BaseExceptionConstructor<T> {
  message: string;
  errorCode?: T;
  retry?: boolean;
  severity?: SeverityLevel;
  error?: any;
}

export type SeverityLevel = "HIGH" | "MEDIUM" | "LOW";

export class BaseException<T> extends Error {
  accessor errorCode: T;
  accessor retry: boolean = false;
  accessor severity: SeverityLevel = "LOW";
  accessor error: any;

  constructor(params: BaseExceptionConstructor<T>) {
    super(params.message);
    this.errorCode = params.errorCode;
    this.retry = params.retry;
    this.severity = params.severity;
    this.error = params.error;
  }

  public generateLogMessage() {
    return JSON.stringify({
      message: this.message,
      errorCode: this.errorCode,
      retry: this.retry,
      severity: this.severity,
      error: this.error,
    });
  }
}
