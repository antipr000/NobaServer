import { clearAccessTokenForNextRequests, setAccessTokenForTheNextRequests } from "../common";
import { setUpEnvironmentVariablesToLoadTheSourceCode } from "../setup";
const port: number = setUpEnvironmentVariablesToLoadTheSourceCode();

import { EndToEndTestUtils } from "./EndToEndTestUtils";

describe("Onboarding consumer flow", () => {
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

  it("onboard a consumer in Colombia", async () => {
    const phoneNumber = testUtils.getRandomPhoneNumber("57");

    // First login request will signup the consumer
    const signupResponse = await testUtils.post("/v1/auth/login", {
      emailOrPhone: phoneNumber,
      identityType: "CONSUMER",
      autoCreate: true,
    });

    expect(signupResponse.status).toBe(201);

    let verifyOtpResponse = await testUtils.post("/v1/auth/verifyotp", {
      emailOrPhone: phoneNumber,
      identityType: "CONSUMER",
      otp: TEST_OTP,
      includeRefreshToken: true,
    });

    expect(verifyOtpResponse.status).toBe(201);
    expect(verifyOtpResponse.data.accessToken).toBeDefined();
    expect(verifyOtpResponse.data.refreshToken).toBeDefined();

    // Now we need to verify if access token is valid by gettiung the consumer
    setAccessTokenForTheNextRequests(verifyOtpResponse.data.accessToken);
    let getConsumerResponse = await testUtils.get("/v1/consumers");
    expect(getConsumerResponse.status).toBe(200);
    expect(getConsumerResponse.data.phone).toBe(phoneNumber);

    // Patch the consumer
    const patchConsumerResponse = await testUtils.patch("/v1/consumers", {
      dateOfBirth: "1990-01-01",
      firstName: "John",
      lastName: "Doe",
    });
    expect(patchConsumerResponse.status).toBe(200);
    expect(patchConsumerResponse.data.firstName).toBe("John");
    expect(patchConsumerResponse.data.lastName).toBe("Doe");
    expect(patchConsumerResponse.data.dateOfBirth).toBe("1990-01-01");

    // Add email to the consumer
    const email = testUtils.getRandomEmail("john.doe");
    const addEmailResponse = await testUtils.post("/v1/consumers/email/verify", {
      email: email,
    });
    expect(addEmailResponse.status).toBe(201);

    // Verify email
    verifyOtpResponse = await testUtils.patch("/v1/consumers/email", {
      email: email,
      otp: TEST_OTP,
    });
    expect(verifyOtpResponse.status).toBe(200);
    expect(verifyOtpResponse.data.email).toBe(email);

    // Check if the consumer has the email
    getConsumerResponse = await testUtils.get("/v1/consumers");
    expect(getConsumerResponse.status).toBe(200);
    expect(getConsumerResponse.data.email).toBe(email);
    expect(getConsumerResponse.data.phone).toBe(phoneNumber);

    // Add handle to the consumer
    const handle = testUtils.getRandomHandle("johndoe");
    const verifyHandleResponse = await testUtils.get("/v1/consumers/handles/availability?handle=" + handle);
    expect(verifyHandleResponse.status).toBe(200);
    expect(verifyHandleResponse.data.isAvailable).toBeTruthy();
    expect(verifyHandleResponse.data.handle).toBe(handle);
    const addHandleResponse = await testUtils.patch("/v1/consumers", {
      handle: handle,
    });
    expect(addHandleResponse.status).toBe(200);
    expect(addHandleResponse.data.handle).toBe(handle);

    // KYC Check flow
    const getSessionKey = await testUtils.post("/v1/verify/session", {});
    expect(getSessionKey.status).toBe(201);
    const sessionKey = getSessionKey.data;
    const kycCheckResponse = await testUtils.post("/v1/verify/consumerinfo?sessionKey=" + sessionKey, {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "1990-01-01",
      phoneNumber: phoneNumber,
      address: {
        streetLine1: "Calle 123",
        streetLine2: "Carrera 123",
        city: "Bogota",
        regionCode: "BO",
        countryCode: "CO",
        postalCode: "123456",
      },
    });

    expect(kycCheckResponse.status).toBe(200);
    expect(kycCheckResponse.data.status).toBe("Approved");

    getConsumerResponse = await testUtils.get("/v1/consumers");
    expect(getConsumerResponse.data.kycVerificationData.kycVerificationStatus).toBe("Approved");
    expect(getConsumerResponse.data.documentVerificationData.documentVerificationStatus).toBe("NotSubmitted");

    // Login again with the same email
    clearAccessTokenForNextRequests();
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
    expect(verifyOtpResponse.data.accessToken).toBeDefined();
    expect(verifyOtpResponse.data.refreshToken).toBe("");

    // Verifying if access token is valid
    setAccessTokenForTheNextRequests(verifyOtpResponse.data.accessToken);
    getConsumerResponse = await testUtils.get("/v1/consumers");

    expect(getConsumerResponse.status).toBe(200);
    expect(getConsumerResponse.data.email).toBe(email);
  });
});
