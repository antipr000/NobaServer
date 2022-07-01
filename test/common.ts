import { MongoClient } from "mongodb";

export const fetchOtpFromDb = async (mongoUri: string, email: string, identityType: string): Promise<number> => {
  // Setup a mongodb client for interacting with "admins" collection.
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const otpCollection = mongoClient.db("").collection("otps");
  const otpDocumetsCursor = await otpCollection.find({});
  let otp = undefined;

  while (await otpDocumetsCursor.hasNext()) {
    const otpDocument = await otpDocumetsCursor.next();

    if ((otpDocument.emailOrPhone ?? "") === email && (otpDocument.identityType ?? "") === identityType) {
      otp = otpDocument.otp;
      break;
    }
  }

  await mongoClient.close();

  if (otp === undefined) throw Error(`No login with email '${email}' & identityType '${identityType}'.`);
  return otp;
};

export const insertAdmin = async (mongoUri: string, email: string, id: string, role: string): Promise<boolean> => {
  // Setup a mongodb client for interacting with "admins" collection.
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const adminCollection = mongoClient.db("").collection("admins");
  await adminCollection.insertOne({
    _id: id as any,
    email: email,
    role: role,
  });

  await mongoClient.close();
  return true;
};
