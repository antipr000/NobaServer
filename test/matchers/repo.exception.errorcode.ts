import { RepoErrorCode, RepoException } from "../../src/core/exception/repo.exception";

declare global {
  namespace jest {
    interface Matchers<R> {
      toThrowRepoException(expectedErrorCode?: RepoErrorCode, expectedMessage?: string): CustomMatcherResult;
    }
  }
}

const mismatchResult = (message: string) => ({
  pass: false,
  message: () => message,
});

expect.extend({
  toThrowRepoException(
    received: RepoException,
    expectedErrorCode?: RepoErrorCode,
    expectedMessage?: string,
  ): jest.CustomMatcherResult {
    const isRepoException = received instanceof RepoException;
    if (!isRepoException) {
      return mismatchResult("Not a Repo Exception");
    }

    if (expectedErrorCode && received.errorCode !== expectedErrorCode) {
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
