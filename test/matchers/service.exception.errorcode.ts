import { ServiceErrorCode, ServiceException } from "../../src/core/exception/service.exception";

declare global {
  namespace jest {
    interface Matchers<R> {
      toThrowServiceExceptionWithErrorCode(
        expectedErrorCode: ServiceErrorCode,
        expectedMessage?: string,
      ): CustomMatcherResult;
    }
  }
}

const mismatchResult = (message: string) => ({
  pass: false,
  message: () => message,
});

expect.extend({
  toThrowServiceExceptionWithErrorCode(
    received: ServiceException,
    expectedErrorCode: ServiceErrorCode,
    expectedMessage?: string,
  ): jest.CustomMatcherResult {
    const isServiceException = received instanceof ServiceException;
    if (!isServiceException) {
      return mismatchResult("Not a Service Exception");
    }

    if (received.errorCode !== expectedErrorCode) {
      return mismatchResult(
        `Recieved Exception error code:"${received.errorCode}" different from expected error code:"${expectedErrorCode}"`,
      );
    }

    if (expectedMessage && received.message.indexOf(expectedMessage) === -1) {
      return mismatchResult(
        `Recieved Exception message:"${received.message}" does not contain message:"${expectedMessage}"`,
      );
    }

    return {
      pass: true,
      message: () => ``,
    };
  },
});
