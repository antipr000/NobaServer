import { setAccessTokenForTheNextRequests } from "../common";
import { setUpEnvironmentVariablesToLoadTheSourceCode } from "../setup";
const port: number = setUpEnvironmentVariablesToLoadTheSourceCode();

import { EndToEndTestUtils } from "./EndToEndTestUtils";

describe("Signup and Login consumer flow", () => {
  jest.setTimeout(20000);
  let testUtils: EndToEndTestUtils;
  const TEST_OTP = 333333;

  beforeAll(async () => {
    testUtils = await EndToEndTestUtils.setUp(port);
  });

  afterAll(async () => {
    await testUtils.tearDown();
  });

  afterEach(async () => {
    await testUtils.reset();
  });

  it("should signup and login a consumer when autoCreate is true", async () => {
    const email = testUtils.getRandomEmail("consumer");

    // First login request will signup the consumer
    const signupResponse = await testUtils.post("/v1/auth/login", {
      emailOrPhone: email,
      identityType: "CONSUMER",
      autoCreate: true,
    });

    expect(signupResponse.status).toBe(201);

    let verifyOtpResponse = await testUtils.post("/v1/auth/verifyotp", {
      emailOrPhone: email,
      identityType: "CONSUMER",
      otp: TEST_OTP,
      includeRefreshToken: true,
    });

    expect(verifyOtpResponse.status).toBe(201);
    expect(verifyOtpResponse.data.accessToken).toBeTruthy();
    expect(verifyOtpResponse.data.refreshToken).toBeTruthy();

    // Verifying if access token is valid
    setAccessTokenForTheNextRequests(verifyOtpResponse.data.accessToken);

    let getConsumerResponse = await testUtils.get("/v1/consumers");

    expect(getConsumerResponse.status).toBe(200);
    expect(getConsumerResponse.data.email).toBe(email);

    // Login again with the same email
    const loginResponse = await testUtils.post("/v1/auth/login", {
      emailOrPhone: email,
      identityType: "CONSUMER",
      autoCreate: true,
    });

    expect(loginResponse.status).toBe(201);

    verifyOtpResponse = await testUtils.post("/v1/auth/verifyotp", {
      emailOrPhone: email,
      identityType: "CONSUMER",
      otp: TEST_OTP,
      includeRefreshToken: false,
    });

    expect(verifyOtpResponse.status).toBe(201);
    expect(verifyOtpResponse.data.accessToken).toBeTruthy();
    expect(verifyOtpResponse.data.refreshToken).toBeFalsy();

    // Verifying if access token is valid
    setAccessTokenForTheNextRequests(verifyOtpResponse.data.accessToken);
    getConsumerResponse = await testUtils.get("/v1/consumers");

    expect(getConsumerResponse.status).toBe(200);
    expect(getConsumerResponse.data.email).toBe(email);
  });
});
