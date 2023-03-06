import { Admin, PrismaClient } from "@prisma/client";
import { AdminService, AuthenticationService, LoginResponseDTO } from "./api_client";
import { ResponseStatus } from "./api_client/core/request";
import CryptoJS from "crypto-js";
import { ConsumerProps } from "../src/modules/consumer/domain/Consumer";
import { ConsumerRepoMapper } from "../src/modules/consumer/mappers/ConsumerRepoMapper";

export const TEST_OTP = 333333;

export const insertNobaAdmin = async (ignore: any, email: string, id: string, role: string): Promise<Admin> => {
  const prisma = new PrismaClient();
  await prisma.$connect();

  const admin = await prisma.admin.create({
    data: { id: id, email: email, name: "Test", role: role },
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

export const loginNobaAdminAndGetResponse = async (email: string): Promise<LoginResponseDTO & ResponseStatus> => {
  setAccessTokenForTheNextRequests("testAdminBearerToken");
  await AdminService.loginAdmin({
    requestBody: {
      emailOrPhone: email,
    },
  });

  const verifyOtpRequestBody = {
    emailOrPhone: email,
    otp: TEST_OTP,
  };

  const response = await AdminService.verifyAdminOtp({
    requestBody: verifyOtpRequestBody,
  });

  clearAccessTokenForNextRequests();

  return response as LoginResponseDTO & ResponseStatus;
};

export const loginAndGetResponse = async (email: string): Promise<LoginResponseDTO & ResponseStatus> => {
  const requestBody = {
    emailOrPhone: email,
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

export async function patchConsumer(consumer: Partial<ConsumerProps>) {
  const prisma = new PrismaClient();
  await prisma.$connect();

  await prisma.consumer.update({
    where: { email: consumer.email },
    data: new ConsumerRepoMapper().toUpdateConsumerInput(consumer),
  });

  await prisma.$disconnect();
}

export async function getConsumer(email: string) {
  const prisma = new PrismaClient();
  await prisma.$connect();

  const consumer = await prisma.consumer.findUnique({
    where: { email },
    include: { address: true, verificationData: true },
  });

  await prisma.$disconnect();
  return consumer;
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
