import { BaseException } from "../../src/core/exception/base.exception";

declare global {
  namespace jest {
    interface Matchers<R> {
      toThrowExceptionWithErrorCode(expected: string): CustomMatcherResult;
    }
  }
}

const mismatchResult = (message: string) => ({
  pass: false,
  message: () => message,
});

expect.extend({
  toThrowExceptionWithErrorCode(received, expected): jest.CustomMatcherResult {
    const isBaseError = received instanceof BaseException;
    if (!isBaseError) {
      return mismatchResult("Not a Base Exception");
    }

    if (received.errorCode !== expected) {
      return mismatchResult(
        `Recieved Exception error code:"${received.errorCode}" different from expected error code:"${expected}"`,
      );
    }

    return {
      pass: true,
      message: () => "",
    };
  },
});
