import { MongoClient } from "mongodb";
import { AuthenticationService, VerifyOtpResponseDTO } from "./api_client";
import { ResponseStatus } from "./api_client/core/request";
import * as CryptoJS from "crypto-js";

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

export const insertPartnerAdmin = async (
  mongoUri: string,
  email: string,
  id: string,
  role: string,
  partnerId: string,
): Promise<boolean> => {
  // Setup a mongodb client for interacting with "admins" collection.
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const partnerAdminCollection = mongoClient.db("").collection("partneradmins");
  await partnerAdminCollection.insertOne({
    _id: id as any,
    email: email,
    role: role,
    partnerId: partnerId,
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
  const TEST_TIMESTAMP = "testtimestamp";
  const loginSignature = computeSignature(TEST_TIMESTAMP, "POST", "/v1/auth/login", JSON.stringify(requestBody));
  await AuthenticationService.loginUser(TEST_API_KEY, TEST_TIMESTAMP, loginSignature, requestBody);

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
  return (await AuthenticationService.verifyOtp(
    TEST_API_KEY,
    TEST_TIMESTAMP,
    verifyOtpSignature,
    verifyOtpRequestBody,
  )) as VerifyOtpResponseDTO & ResponseStatus;
};

export const setupPartner = async (mongoUri: string, partnerId: string) => {
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const partnersCollection = mongoClient.db("").collection("partners");
  await partnersCollection.insertOne({
    _id: partnerId as any,
    name: "Test Partner",
    apiKey: TEST_API_KEY,
    secretKey: TEST_SECRET_KEY,
  });

  await mongoClient.close();
  return true;
};

export const computeSignature = (
  timestamp: string,
  requestMethod: string,
  requestPath: string,
  requestBody: string,
) => {
  const signatureString = CryptoJS.enc.Utf8.parse(
    `${timestamp}${TEST_API_KEY}${requestMethod}${requestPath.split("?")[0]}${requestBody}`,
  );
  return CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(signatureString, CryptoJS.enc.Utf8.parse(TEST_SECRET_KEY)));
};

export const dropAllCollections = async (mongoUri: string) => {
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const collections = [
    "partners",
    "admins",
    "locks",
    "otps",
    "partneradmins",
    "transactions",
    "consumers",
    "verificationdatas",
  ];

  const promises = collections.map(collection => mongoClient.db("").dropCollection(collection));
  await Promise.all(promises);
};
