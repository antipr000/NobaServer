import { Test, TestingModule } from "@nestjs/testing";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import {
  MONGO_CONFIG_KEY,
  MONGO_URI,
  NODE_ENV_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../config/ConfigurationUtils";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Collection } from "mongodb";
import mongoose from "mongoose";
import { LockService } from "../lock.service";
import { MongoDBLockRepo } from "../repo/MongoDBLockRepo";
import { ObjectType } from "../domain/ObjectType";
import { LockProps } from "../domain/Lock";

const getAllRecordsInLocksCollection = async (lockCollection: Collection): Promise<Array<LockProps>> => {
  const lockDocumentCursor = lockCollection.find({});
  const allRecords: LockProps[] = [];

  while (await lockDocumentCursor.hasNext()) {
    const lockDocument = await lockDocumentCursor.next();

    allRecords.push({
      ...lockDocument,
      _id: lockDocument._id.toString(),
    } as LockProps);
  }

  return allRecords;
};

describe("LockService", () => {
  jest.setTimeout(10000);

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let lockCollection: Collection;
  let lockService: LockService;

  beforeEach(async () => {
    process.env[NODE_ENV_CONFIG_KEY] = "development";

    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    console.log("MongoMemoryServer running at: ", mongoUri);

    const environmentVariables = {
      [MONGO_CONFIG_KEY]: {
        [MONGO_URI]: mongoUri,
      },
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
      providers: [
        DBProvider,
        LockService,
        {
          provide: "LockRepo",
          useClass: MongoDBLockRepo,
        },
      ],
    }).compile();

    lockService = app.get<LockService>(LockService);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    lockCollection = mongoClient.db("").collection("locks");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should acquire lock for a given key", async () => {
    const key = "transaction-1";
    const lockId = await lockService.acquireLockForKey(key, ObjectType.TRANSACTION);
    const allLocks = await getAllRecordsInLocksCollection(lockCollection);
    expect(allLocks.length).toBe(1);
    expect(lockId).toBeTruthy();
    expect(lockId).toBe(allLocks[0]._id);
  });

  it("should release lock for an acquired key", async () => {
    const key = "transaction-1";
    await lockService.acquireLockForKey(key, ObjectType.TRANSACTION);
    let allLocks = await getAllRecordsInLocksCollection(lockCollection);
    expect(allLocks.length).toBe(1);

    await lockService.releaseLockForKey(key, ObjectType.TRANSACTION);
    allLocks = await getAllRecordsInLocksCollection(lockCollection);
    expect(allLocks.length).toBe(0);
  });

  it("should return null when trying to acquire an already acquired lock", async () => {
    const key = "transaction-1";
    await lockService.acquireLockForKey(key, ObjectType.TRANSACTION);
    const lockId = await lockService.acquireLockForKey(key, ObjectType.TRANSACTION);
    const allLocks = await getAllRecordsInLocksCollection(lockCollection);
    expect(lockId).toBeNull();
    expect(allLocks.length).toBe(1);
  });
});
