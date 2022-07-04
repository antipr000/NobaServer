import { MongoClient } from "mongodb";
import { VerifyOtpResponseDTO } from "src/modules/auth/dto/VerifyOtpReponse";
import { AuthenticationService } from "./api_client";
import { ResponseStatus } from "./api_client/core/request";

export const fetchOtpFromDb = async (mongoUri: string, email: string, identityType: string): Promise<number> => {
  // Setup a mongodb client for interacting with "admins" collection.
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const otpCollection = mongoClient.db("").collection("otps");
  const otpDocumentsCursor = await otpCollection.find({});
  let otp = undefined;

  while (await otpDocumentsCursor.hasNext()) {
    const otpDocument = await otpDocumentsCursor.next();

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
    name: "Test"
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

export const loginAndGetResponse =
  async (
    mongoUri: string,
    email: string,
    identityType: string
  ): Promise<VerifyOtpResponseDTO & ResponseStatus> => {
    await AuthenticationService.loginUser({
      email: email,
      identityType: identityType as any,
    });

    return (await AuthenticationService.verifyOtp({
      emailOrPhone: email,
      identityType: identityType as any,
      otp: await fetchOtpFromDb(mongoUri, email, identityType),
    })) as (VerifyOtpResponseDTO & ResponseStatus);
  };