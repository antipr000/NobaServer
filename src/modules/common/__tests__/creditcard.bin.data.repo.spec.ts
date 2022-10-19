import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { CreditCardBinData } from "../domain/CreditCardBinData";
import { MongoDBCreditCardBinDataRepo } from "../repo/MongoDBCreditCardBinDataRepo";
import { CreditCardBinDataRepo } from "../repo/CreditCardBinDataRepo";
import { BINValidity, CardType } from "../dto/CreditCardDTO";

const getAllRecordsInCreditCardBinDataCollection = async (
  creditCardBinDataCollection: Collection,
): Promise<Array<CreditCardBinData>> => {
  const creditCardBinDataDocumentsCursor = creditCardBinDataCollection.find({});
  const allRecords: CreditCardBinData[] = [];

  while (await creditCardBinDataDocumentsCursor.hasNext()) {
    const document = await creditCardBinDataDocumentsCursor.next();

    const currentRecord: CreditCardBinData = CreditCardBinData.createCreditCardBinDataObject({
      _id: document._id.toString(),
      issuer: document.issuer,
      bin: document.bin,
      type: document.type,
      network: document.network,
      mask: document.mask,
      supported: document.supported,
      digits: document.digits,
      cvvDigits: document.cvvDigits,
    });
    allRecords.push(currentRecord);
  }

  return allRecords;
};

describe("CreditCardBinDataRepo", () => {
  jest.setTimeout(20000);

  let creditCardBinDataRepo: CreditCardBinDataRepo;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let creditCardBinDataCollection;

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
      providers: [DBProvider, MongoDBCreditCardBinDataRepo],
    }).compile();

    creditCardBinDataRepo = app.get<MongoDBCreditCardBinDataRepo>(MongoDBCreditCardBinDataRepo);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    creditCardBinDataCollection = mongoClient.db("").collection("creditcardbindata");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  async function insertFakeCreditCardBinData(iin: string, id: string, supported?: BINValidity) {
    await creditCardBinDataCollection.insertOne({
      _id: id as any,
      issuer: "chase",
      bin: iin,
      type: "Credit",
      network: "VISA",
      mask: "1234XXXXXXXXX",
      supported: supported ?? BINValidity.NOT_SUPPORTED,
      digits: 16,
      cvvDigits: 4,
    });
  }

  describe("add", () => {
    it("should add new creditCardBinData to db", async () => {
      const newCreditCardBinData = CreditCardBinData.createCreditCardBinDataObject({
        _id: "fake-id-1234",
        issuer: "chase",
        bin: "fake-bin",
        type: CardType.CREDIT,
        network: "VISA",
        mask: "1234XXXXXXXXX",
        supported: BINValidity.NOT_SUPPORTED,
        digits: 16,
        cvvDigits: 4,
      });

      const addedBinData: CreditCardBinData = await creditCardBinDataRepo.add(newCreditCardBinData);
      const allDocumentsInCreditCardBinData = await getAllRecordsInCreditCardBinDataCollection(
        creditCardBinDataCollection,
      );

      expect(allDocumentsInCreditCardBinData).toHaveLength(1);
      delete addedBinData.props["__v"];
      delete addedBinData.props["createdTimestamp"];
      delete addedBinData.props["updatedTimestamp"];
      expect(addedBinData).toStrictEqual(newCreditCardBinData);
    });

    it("should return null when adding new creditCardBinData fails", async () => {
      await insertFakeCreditCardBinData("12345", "fake-id-1234");
      const newCreditCardBinData = CreditCardBinData.createCreditCardBinDataObject({
        _id: "fake-id-1234",
        issuer: "chase",
        bin: "fake-bin",
        type: CardType.CREDIT,
        network: "VISA",
        mask: "1234XXXXXXXXX",
        supported: BINValidity.NOT_SUPPORTED,
        digits: 16,
        cvvDigits: 4,
      });

      const response = await creditCardBinDataRepo.add(newCreditCardBinData);
      expect(response).toBeNull();
    });
  });

  describe("update", () => {
    it("should update creditCardBinData", async () => {
      await insertFakeCreditCardBinData("12345", "fake-bin-1234", BINValidity.NOT_SUPPORTED);

      const updatedCreditCardBinData = CreditCardBinData.createCreditCardBinDataObject({
        _id: "fake-bin-1234",
        issuer: "chase",
        bin: "12345",
        type: CardType.CREDIT,
        network: "VISA",
        mask: "1234XXXXXXXXX",
        supported: BINValidity.SUPPORTED,
        digits: 16,
        cvvDigits: 4,
      });

      const response = await creditCardBinDataRepo.update(updatedCreditCardBinData);

      delete response.props["__v"];
      delete response.props["createdTimestamp"];
      delete response.props["updatedTimestamp"];

      expect(response).toStrictEqual(updatedCreditCardBinData);
    });

    it("should update creditCardBinData", async () => {
      const updatedCreditCardBinData = CreditCardBinData.createCreditCardBinDataObject({
        _id: "fake-bin-1234",
        issuer: "chase",
        bin: "12345",
        type: CardType.CREDIT,
        network: "VISA",
        mask: "1234XXXXXXXXX",
        supported: BINValidity.SUPPORTED,
        digits: 16,
        cvvDigits: 4,
      });

      const response = await creditCardBinDataRepo.update(updatedCreditCardBinData);

      expect(response).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete bin data", async () => {
      await insertFakeCreditCardBinData("12345", "fake-bin-1234", BINValidity.NOT_SUPPORTED);

      await creditCardBinDataRepo.deleteByID("fake-bin-1234");

      const data = await getAllRecordsInCreditCardBinDataCollection(creditCardBinDataCollection);
      expect(data.length).toBe(0);
    });
  });

  describe("findById", () => {
    it("should find bin data", async () => {
      await insertFakeCreditCardBinData("12345", "fake-bin-1234", BINValidity.NOT_SUPPORTED);

      const binData = await creditCardBinDataRepo.findByID("fake-bin-1234");

      expect(binData.props.bin).toBe("12345");
      expect(binData.props.supported).toBe(BINValidity.NOT_SUPPORTED);
    });

    it("should return null when bin data is not found", async () => {
      const binData = await creditCardBinDataRepo.findByID("fake-bin-1234");

      expect(binData).toBeNull();
    });
  });

  describe("findCardByExactBIN()", () => {
    it("should return proper creditCardBinData which matches bin", async () => {
      insertFakeCreditCardBinData("22123456", "fake-id-2345");
      insertFakeCreditCardBinData("123456", "fake-id-1234");

      const creditCardBinData = await creditCardBinDataRepo.findCardByExactBIN("123456");
      expect(creditCardBinData.props._id).toBe("fake-id-1234");
    });

    it("returns null if it doesn't find creditCardBinData with exact BIN", async () => {
      insertFakeCreditCardBinData("22123456", "fake-id-2345");
      insertFakeCreditCardBinData("1234567", "fake-id-1234");

      const result = await creditCardBinDataRepo.findCardByExactBIN("34");
      expect(result).toBe(null);
    });
  });

  describe("getBINReport", () => {
    it("should return report of supported and unsupported bins", async () => {
      insertFakeCreditCardBinData("123456", "fake-123456", BINValidity.SUPPORTED);
      insertFakeCreditCardBinData("234566", "fake-234566", BINValidity.NOT_SUPPORTED);
      insertFakeCreditCardBinData("343434", "fake-343434", BINValidity.NOT_SUPPORTED);
      insertFakeCreditCardBinData("345677", "fake-345677", BINValidity.SUPPORTED);
      insertFakeCreditCardBinData("456788", "fake-456788", BINValidity.NOT_SUPPORTED);

      const report = await creditCardBinDataRepo.getBINReport();
      expect(report.unsupported).toBe(3);
      expect(report.supported).toBe(2);
    });
  });
});
