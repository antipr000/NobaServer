interface BaseExceptionConstructor<T> extends ExceptionConstructor<T> {
  message: string;
}

export interface ExceptionConstructor<T> {
  errorCode: T;
  retry?: boolean;
  messageFormat?: MessageFormat;
  severity?: SeverityLevel;
  error?: any;
}

export enum SeverityLevel {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export enum MessageFormat {
  JSON = "JSON",
  TEXT = "TEXT",
}

export class BaseException<T> extends Error {
  accessor errorCode: T;
  accessor retry: boolean = false;
  accessor messageFormat: MessageFormat = MessageFormat.TEXT;
  accessor severity: SeverityLevel = SeverityLevel.LOW;
  accessor error: any;

  constructor(params: BaseExceptionConstructor<T>) {
    super(params.message);
    this.errorCode = params.errorCode;
    this.retry = params.retry;
    this.messageFormat = params.messageFormat;
    this.severity = params.severity;
    this.error = params.error;
  }

  public generateLogMessage() {
    return JSON.stringify({
      message: this.message,
      errorCode: this.errorCode,
      retry: this.retry,
      messageFormat: this.messageFormat,
      severity: this.severity,
      error: this.error,
    });
  }
}
