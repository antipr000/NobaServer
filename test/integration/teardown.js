import { IntegrationTestUtility } from "../TestUtils";

module.exports = async () => {
  console.log("Tearing down integration test environment...");
  const testUtils = new IntegrationTestUtility();
  await testUtils.tearDown();
};
