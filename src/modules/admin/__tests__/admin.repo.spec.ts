import { TestingModule, Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { AdminMapper } from "../mappers/AdminMapper";
import { MongoMemoryServer } from "mongodb-memory-server";
import { IAdminTransactionRepo, MongoDBAdminTransactionRepo } from "../repos/transactions/AdminTransactionRepo";
import { Admin } from "../domain/Admin";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { random } from "nanoid";
import mongoose from "mongoose";
import { MongoClient, Db, Collection } from "mongodb";

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
    currentRecord.props.version = adminDocument.__v;

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
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${random(8)}.log`,
    };

    const configModule = ConfigModule.forRoot({
      ignoreEnvFile: true, // don't use .env, .env.local etc.
      load: [() => appConfigurations], // load configurations from the given objects
      isGlobal: true, //marking as global so won't have to import in each module separately
    });
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    const app: TestingModule = await Test.createTestingModule({
      imports: [getWinstonModule(), configModule],
      providers: [AdminMapper, DBProvider, MongoDBAdminTransactionRepo],
    }).compile();

    adminTransactionRepo = app.get<MongoDBAdminTransactionRepo>(MongoDBAdminTransactionRepo);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    adminCollection = mongoClient.db('').collection("admins");
  });

  afterEach(async () => {
    mongoose.disconnect();
    mongoClient.close();
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
});
