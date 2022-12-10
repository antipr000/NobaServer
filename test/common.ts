import { MongoClient } from "mongodb";
import { AuthenticationService, VerifyOtpResponseDTO } from "./api_client";
import { ResponseStatus } from "./api_client/core/request";
import CryptoJS from "crypto-js";
import { ConsumerProps } from "../src/modules/consumer/domain/Consumer";

export const fetchOtpFromDb = async (mongoUri: string, email: string, identityType: string): Promise<number> => {
  // Setup a mongodb client for interacting with "admins" collection.
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const otpCollection = mongoClient.db("").collection("otps");
  const otpDocumentsCursor = await otpCollection.find({});
  let otp = undefined;

  while (await otpDocumentsCursor.hasNext()) {
    const otpDocument = await otpDocumentsCursor.next();
    // console.log(otpDocument);

    if ((otpDocument.emailOrPhone ?? "") === email && (otpDocument.identityType ?? "") === identityType) {
      otp = otpDocument.otp;
      break;
    }
  }

  await mongoClient.close();

  if (otp === undefined) throw Error(`No login with email '${email}' & identityType '${identityType}'.`);
  return otp;
};

export const insertNobaAdmin = async (mongoUri: string, email: string, id: string, role: string): Promise<boolean> => {
  // Setup a mongodb client for interacting with "admins" collection.
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const adminCollection = mongoClient.db("").collection("admins");
  await adminCollection.insertOne({
    _id: id as any,
    email: email,
    role: role,
    name: "Test",
  });

  await mongoClient.close();
  return true;
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
  mongoUri: string,
  email: string,
  identityType: string,
): Promise<VerifyOtpResponseDTO & ResponseStatus> => {
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
    otp: await fetchOtpFromDb(mongoUri, email, identityType),
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
  })) as VerifyOtpResponseDTO & ResponseStatus;
};

export async function patchConsumer(consumer: Partial<ConsumerProps>, mongoUri: string) {
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const consumersCollection = mongoClient.db("").collection("consumers");
  await consumersCollection.findOneAndUpdate(
    { email: consumer.email },
    {
      $set: consumer,
    },
  );
  await mongoClient.close();
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

export const dropAllCollections = async (mongoUri: string) => {
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const collections = ["admins", "locks", "otps", "transactions", "consumers", "verificationdatas"];

  const promises = collections.map(collection => mongoClient.db("").dropCollection(collection));
  await Promise.all(promises);
};
