import { TestingModule, Test } from "@nestjs/testing";
import { AdminMapper } from "../mappers/AdminMapper";
import { MongoMemoryServer } from "mongodb-memory-server";
import { IAdminTransactionRepo, MongoDBAdminTransactionRepo } from "../repos/transactions/AdminTransactionRepo";
import { Admin } from "../domain/Admin";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { NotFoundException } from "@nestjs/common";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";

const getAllRecordsInAdminCollection = async (adminCollection: Collection): Promise<Array<Admin>> => {
  const adminDocumetsCursor = await adminCollection.find({});
  const allRecords: Admin[] = [];

  while (await adminDocumetsCursor.hasNext()) {
    const adminDocument = await adminDocumetsCursor.next();

    const currentRecord: Admin = Admin.createAdmin({
      _id: adminDocument._id.toString(),
      name: adminDocument.name,
      email: adminDocument.email,
      role: adminDocument.role,
    });
    allRecords.push(currentRecord);
  }

  return allRecords;
};

describe("AdminController", () => {
  jest.setTimeout(20000);

  let adminTransactionRepo: IAdminTransactionRepo;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let adminCollection: Collection;

  beforeEach(async () => {
    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    console.log("MongoMemoryServer running at: ", mongoUri);

    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
    /**
     *
     * This will be used to configure the testing module and will decouple
     * the testing module from the actual module.
     *
     * Never hard-code the environment variables "KEY_NAME" in the testing module.
     * All the keys used in 'appconfigs' are defined in
     * `config/ConfigurationUtils` and it should be used for all the testing modules.
     *
     **/
    const appConfigurations = {
      [MONGO_CONFIG_KEY]: {
        [MONGO_URI]: mongoUri,
      },
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [AdminMapper, DBProvider, MongoDBAdminTransactionRepo],
    }).compile();

    adminTransactionRepo = app.get<MongoDBAdminTransactionRepo>(MongoDBAdminTransactionRepo);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    adminCollection = mongoClient.db("").collection("admins");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("addNobaAdmin", () => {
    it("should insert a NobaAdmin record to the DB", async () => {
      const newAdmin = Admin.createAdmin({
        email: "admin@noba.com",
        name: "Admin",
        role: "BASIC",
        _id: "AAAAAAAAAA",
      });

      const addedAdmin: Admin = await adminTransactionRepo.addNobaAdmin(newAdmin);
      const allDocumentsInAdmin = await getAllRecordsInAdminCollection(adminCollection);

      expect(allDocumentsInAdmin).toHaveLength(1);
      expect(addedAdmin).toEqual(allDocumentsInAdmin[0]);
    });
  });

  describe("getNobaAdminByEmail", () => {
    it("should return 'undefined' if admind with that email doesn't exists", async () => {
      const retrievedAdmin: Admin = await adminTransactionRepo.getNobaAdminByEmail("admin@noba.com");

      expect(retrievedAdmin).toBeUndefined();
    });

    it("should return 'Admin' with the given email", async () => {
      const admin: Admin = Admin.createAdmin({
        email: "admin@noba.com",
        name: "Admin",
        role: "BASIC",
        _id: "AAAAAAAAAAAA",
      });

      await adminCollection.insertOne({
        _id: admin.props._id as any,
        name: admin.props.name,
        email: admin.props.email,
        role: admin.props.role,
      });

      const retrievedAdmin: Admin = await adminTransactionRepo.getNobaAdminByEmail("admin@noba.com");

      expect(retrievedAdmin).toEqual(admin);
    });
  });

  describe("updateNobaAdmin", () => {
    it("should update the 'Admin' with the given email", async () => {
      const admin: Admin = Admin.createAdmin({
        email: "admin@noba.com",
        name: "Admin",
        role: "BASIC",
        _id: "AAAAAAAAAAAA",
      });
      await adminCollection.insertOne({
        _id: admin.props._id as any,
        name: admin.props.name,
        email: admin.props.email,
        role: admin.props.role,
      });

      const updatedAdmin: Admin = Admin.createAdmin({
        email: "admin@noba.com",
        name: "Admin New Name",
        role: "INTERMEDIATE",
        _id: "AAAAAAAAAAAA",
      });
      const retrievedAdmin: Admin = await adminTransactionRepo.updateNobaAdmin(updatedAdmin);

      const allDocumentsInAdmin = await getAllRecordsInAdminCollection(adminCollection);
      expect(allDocumentsInAdmin).toHaveLength(1);
      expect(retrievedAdmin).toEqual(allDocumentsInAdmin[0]);
    });

    it("should throw 'NotFoundException' if the 'Admin' with given email not found", async () => {
      const admin: Admin = Admin.createAdmin({
        email: "admin@noba.com",
        name: "Admin",
        role: "BASIC",
        _id: "AAAAAAAAAAAA",
      });

      try {
        await adminTransactionRepo.updateNobaAdmin(admin);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });
});
