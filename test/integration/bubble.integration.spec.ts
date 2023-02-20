import { setUpEnvironmentVariablesToLoadTheSourceCode } from "../setup";
const port: number = setUpEnvironmentVariablesToLoadTheSourceCode();

import { IntegrationTestUtility } from "../TestUtils";

describe("Bubble Tests", () => {
  jest.setTimeout(20000);

  let integrationTestUtils: IntegrationTestUtility;
  let TEST_TIMESTAMP;
  beforeAll(async () => {
    integrationTestUtils = await IntegrationTestUtility.setUp(port);
    TEST_TIMESTAMP = new Date().getTime().toString();
  });

  afterAll(async () => {
    await integrationTestUtils.tearDown();
  });

  afterEach(async () => {
    await integrationTestUtils.reset();
  });
});
