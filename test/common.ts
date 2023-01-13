import { Admin, PrismaClient } from "@prisma/client";
import { AuthenticationService, LoginResponseDTO } from "./api_client";
import { ResponseStatus } from "./api_client/core/request";
import CryptoJS from "crypto-js";
import { ConsumerProps } from "../src/modules/consumer/domain/Consumer";
import { ConsumerRepoMapper } from "../src/modules/consumer/mappers/ConsumerRepoMapper";

export const TEST_OTP = 222222;

export const insertNobaAdmin = async (ignore: any, email: string, id: string, role: string): Promise<Admin> => {
  const prisma = new PrismaClient();
  await prisma.$connect();

  const admin = await prisma.admin.create({
    data: { email: email, name: "Test", role: role },
  });

  await prisma.$disconnect();
  return admin;
};

export const setAccessTokenForTheNextRequests = accessToken => {
  process.env.ACCESS_TOKEN = accessToken;
};

export const clearAccessTokenForNextRequests = () => {
  delete process.env.ACCESS_TOKEN;
};

export const TEST_API_KEY = "testapikey";
export const TEST_SECRET_KEY = "testsecretkey";

export const loginAndGetResponse = async (
  ignore: any,
  email: string,
  identityType: string,
): Promise<LoginResponseDTO & ResponseStatus> => {
  const requestBody = {
    email: email,
    identityType: identityType as any,
  };
  const TEST_TIMESTAMP = new Date().getTime().toString();
  const loginSignature = computeSignature(TEST_TIMESTAMP, "POST", "/v1/auth/login", JSON.stringify(requestBody));
  await AuthenticationService.loginUser({
    xNobaApiKey: TEST_API_KEY,
    xNobaSignature: loginSignature,
    xNobaTimestamp: TEST_TIMESTAMP,
    requestBody: requestBody,
  });
  const verifyOtpRequestBody = {
    emailOrPhone: email,
    otp: TEST_OTP,
    identityType: identityType as any,
  };

  const verifyOtpSignature = computeSignature(
    TEST_TIMESTAMP,
    "POST",
    "/v1/auth/verifyotp",
    JSON.stringify(verifyOtpRequestBody),
  );
  return (await AuthenticationService.verifyOtp({
    xNobaApiKey: TEST_API_KEY,
    xNobaSignature: verifyOtpSignature,
    xNobaTimestamp: TEST_TIMESTAMP,
    requestBody: verifyOtpRequestBody,
  })) as LoginResponseDTO & ResponseStatus;
};

export async function patchConsumer(consumer: Partial<ConsumerProps>, ignore: any) {
  const prisma = new PrismaClient();
  await prisma.$connect();

  await prisma.consumer.update({
    where: { email: consumer.email },
    data: new ConsumerRepoMapper().toUpdateConsumerInput(consumer),
  });

  await prisma.$disconnect();
}

export const computeSignature = (
  timestamp: string,
  requestMethod: string,
  requestPath: string,
  requestBody: string,
  apiKey = TEST_API_KEY,
  secretKey = TEST_SECRET_KEY,
) => {
  const signatureString = CryptoJS.enc.Utf8.parse(
    `${timestamp}${apiKey}${requestMethod}${requestPath.split("?")[0]}${requestBody}`,
  );
  return CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(signatureString, CryptoJS.enc.Utf8.parse(secretKey)));
};
