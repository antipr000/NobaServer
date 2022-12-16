import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { ConsumerMapper } from "../mappers/ConsumerMapper";
import { IConsumerRepo } from "../repos/ConsumerRepo";
import { SQLConsumerRepo } from "../repos/SQLConsumerRepo";
import { uuid } from "uuidv4";
import { CryptoWallet, CryptoWalletProps } from "../domain/CryptoWallet";
import { WalletStatus } from "@prisma/client";

const getAllConsumerRecords = async (prismaService: PrismaService): Promise<ConsumerProps[]> => {
  const allConsumerProps = await prismaService.consumer.findMany({});
  return allConsumerProps;
};

describe("MongoDBConsumerRepoTests", () => {
  jest.setTimeout(20000);

  let consumerRepo: IConsumerRepo;
  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    // Spin up an in-memory mongodb server

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [ConsumerMapper, PrismaService, SQLConsumerRepo],
    }).compile();

    consumerRepo = app.get<SQLConsumerRepo>(SQLConsumerRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    app.close();
  });

  beforeEach(async () => {
    await prismaService.cryptoWallet.deleteMany();
    await prismaService.consumer.deleteMany();
  });

  describe("createConsumer", () => {
    it("should fail to create a duplicate consumer by email", async () => {
      const consumer = getRandomUser();
      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props.id);
      expect(savedResult.props.id).toBe(result.props.id);
      expect(savedResult.props.email).toBe(consumer.props.email);
      expect(async () => await consumerRepo.createConsumer(consumer)).rejects.toThrow(BadRequestError);
    });

    it("should fail to create a duplicate consumer by phone", async () => {
      const consumer = getRandomUser();
      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props.id);
      expect(savedResult.props.id).toBe(result.props.id);
      expect(savedResult.props.phone).toBe(consumer.props.phone);

      const newConsumer = getRandomUser();
      newConsumer.props.phone = consumer.props.phone;
      expect(async () => await consumerRepo.createConsumer(newConsumer)).rejects.toThrow(BadRequestError);
    });

    it("should fail to create a duplicate consumer by phone even with different spacing", async () => {
      const consumer = getRandomUser();
      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props.id);
      expect(savedResult.props.id).toBe(result.props.id);
      expect(savedResult.props.phone).toBe(consumer.props.phone);
      const phone = consumer.props.phone;
      const newConsumer = getRandomUser();
      newConsumer.props.phone = phone.split("").join(" ");
      expect(async () => await consumerRepo.createConsumer(consumer)).rejects.toThrow(BadRequestError);
    });

    it("should save handle for consumer", async () => {
      const consumer = getRandomUser();
      const handle = uuid();
      consumer.props.handle = handle;
      const returnedResult = await consumerRepo.createConsumer(consumer);

      const savedResults: ConsumerProps[] = await getAllConsumerRecords(prismaService);
      const savedConsumerRecord = savedResults.filter(record => record.id === consumer.props.id);
      expect(savedConsumerRecord.length).toBe(1);
      expect(savedConsumerRecord[0].handle).toBe(handle);

      expect(returnedResult.props.handle).toBe(savedConsumerRecord[0].handle);
    });

    it("should add a 'default' handle (if not specified) before saving the consumer", async () => {
      const consumer = getRandomUser();
      const returnedResult = await consumerRepo.createConsumer(consumer);

      const savedResults: ConsumerProps[] = await (
        await getAllConsumerRecords(prismaService)
      ).filter(record => record.id === consumer.props.id);
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].handle).toBeDefined();
      expect(savedResults[0].handle.length).toBeGreaterThanOrEqual(3);
      expect(savedResults[0].handle.length).toBeLessThanOrEqual(15);
      expect(savedResults[0].handle[0] != "-").toBeTruthy();

      expect(returnedResult.props.handle).toBe(savedResults[0].handle);
    });

    it("should add a 'default' handle which doesn't have 'dots' (.) even if email has it and firstName is not present", async () => {
      const consumer = getRandomUser();
      consumer.props.firstName = null;
      const returnedResult = await consumerRepo.createConsumer(consumer);

      const savedResults: ConsumerProps[] = (await getAllConsumerRecords(prismaService)).filter(
        record => record.id === consumer.props.id,
      );
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].handle).toBeDefined();
      expect(savedResults[0].handle.indexOf(".")).toBe(-1);
      expect(savedResults[0].handle.indexOf("_")).toBe(-1);
      expect(savedResults[0].handle.length).toBeGreaterThanOrEqual(3);
      expect(savedResults[0].handle.length).toBeLessThanOrEqual(15);
      expect(savedResults[0].handle[0] != "-").toBeTruthy();

      expect(returnedResult.props.handle).toBe(savedResults[0].handle);
    });

    it("should add a 'default' handle which doesn't have 'dots' (.) even if firstname has it", async () => {
      const consumer = getRandomUser();
      consumer.props.firstName = "test.test";
      const returnedResult = await consumerRepo.createConsumer(consumer);

      const savedResults: ConsumerProps[] = (await getAllConsumerRecords(prismaService)).filter(
        record => record.id === consumer.props.id,
      );
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].handle).toBeDefined();
      expect(savedResults[0].handle.indexOf(".")).toBe(-1);
      expect(savedResults[0].handle.indexOf("_")).toBe(-1);
      expect(savedResults[0].handle.length).toBeGreaterThanOrEqual(3);
      expect(savedResults[0].handle.length).toBeLessThanOrEqual(15);
      expect(savedResults[0].handle[0] != "-").toBeTruthy();

      expect(returnedResult.props.handle).toBe(savedResults[0].handle);
    });
  });

  describe("getConsumer", () => {
    it("should get a consumer", async () => {
      const consumer = getRandomUser();
      const res = await consumerRepo.getConsumer(consumer.props.id);
      expect(res).toBeNull();

      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props.id);
      expect(savedResult.props.id).toBe(result.props.id);
      expect(savedResult.props.email).toBe(consumer.props.email);
    });
  });

  describe("checkIfUserExists", () => {
    it("should create and find a user by email", async () => {
      const consumer = getRandomUser();
      const result = await consumerRepo.exists(consumer.props.email);
      expect(result).toBe(false);

      const savedConsumer = await consumerRepo.createConsumer(consumer);
      const result2 = await consumerRepo.exists(savedConsumer.props.email);
      expect(result2).toBe(true);
    });

    it("should create and find a user by phone", async () => {
      const consumer = getRandomUser();
      const result = await consumerRepo.exists(consumer.props.phone);
      expect(result).toBe(false);

      const savedConsumer = await consumerRepo.createConsumer(consumer);
      const result2 = await consumerRepo.exists(savedConsumer.props.phone);
      expect(result2).toBe(true);
    });
  });

  describe("getConsumerByEmail", () => {
    it("get a consumer by email", async () => {
      const consumer = getRandomUser();

      const resultNotFound = await consumerRepo.getConsumerByEmail(consumer.props.email);
      expect(resultNotFound.isFailure).toBe(true);

      const savedConsumer = await consumerRepo.createConsumer(consumer);

      const result = await consumerRepo.getConsumerByEmail(savedConsumer.props.email);
      expect(result.isSuccess).toBeTruthy();
      expect(result.getValue().props.email).toBe(consumer.props.email);
    });

    it("should throw an error if passed an empty email address", async () => {
      expect(await (await consumerRepo.getConsumerByEmail(null)).isFailure).toBeTruthy();
    });
  });

  describe("getConsumerByPhone", () => {
    it("should get a consumer by phone if exists", async () => {
      const consumer = getRandomUser();

      const resultNotFound = await consumerRepo.getConsumerByPhone(consumer.props.phone);
      expect(resultNotFound.isFailure).toBe(true);

      await consumerRepo.createConsumer(consumer);
      let savedResult = await consumerRepo.getConsumerByPhone(consumer.props.phone);
      expect(savedResult.isSuccess).toBe(true);
      expect(savedResult.getValue().props.id).toBe(consumer.props.id);

      // should get consumer record even when requested phone number has spaces
      const phone = consumer.props.phone.split("").join(" ");

      savedResult = await consumerRepo.getConsumerByPhone(phone);
      expect(savedResult.isSuccess).toBe(true);
      expect(savedResult.getValue().props.id).toBe(consumer.props.id);
    });

    it("should return failure if passed an empty phone number", async () => {
      const result = await consumerRepo.getConsumerByPhone(null);
      expect(result.isFailure).toBeTruthy();
    });
  });

  describe("updateConsumer", () => {
    it("should update a consumer", async () => {
      const consumer = getRandomUser();
      consumer.props.phone = null;
      const savedConsumer = await consumerRepo.createConsumer(consumer);

      const result = await consumerRepo.getConsumer(savedConsumer.props.id);
      expect(result.props.phone).toBeNull();

      const phone = getRandomPhoneNumber();
      const result1 = await consumerRepo.updateConsumer(consumer.props.id, { phone: phone });
      expect(result1.props.phone).toBe(phone);
      const result2 = await consumerRepo.getConsumer(consumer.props.id);
      expect(result2.props.phone).toBe(phone);
    });

    it("should throw error if tried to update 'handle' which already exists", async () => {
      const consumer1 = getRandomUser();
      await consumerRepo.createConsumer(consumer1);

      const consumer2 = getRandomUser();

      await consumerRepo.createConsumer(consumer2);

      expect(
        async () => await consumerRepo.updateConsumer(consumer2.props.id, { handle: consumer1.props.handle }),
      ).rejects.toThrow(BadRequestError);
    });

    it("should update the consumer if 'handle' is not associated with any Consumer already", async () => {
      const consumer1 = getRandomUser();
      await consumerRepo.createConsumer(consumer1);

      const consumer2 = getRandomUser();
      await consumerRepo.createConsumer(consumer2);

      const newHandle = uuid();
      await consumerRepo.updateConsumer(consumer2.props.id, { handle: newHandle });

      const consumerRecordForId2 = (await getAllConsumerRecords(prismaService)).filter(record => {
        return record.id === consumer2.props.id;
      })[0];
      expect(consumerRecordForId2.handle).toBe(newHandle);
    });

    describe("addCryptoWallet", () => {
      it("should add crypto wallet for consumer", async () => {
        const consumer = getRandomUser();
        await consumerRepo.createConsumer(consumer);

        let wallets = await consumerRepo.getAllCryptoWalletsForConsumer(consumer.props.id);

        expect(wallets).toHaveLength(0);

        const wallet = getRandomCryptoWallet(consumer.props.id);

        const savedResult = await consumerRepo.addCryptoWallet(wallet);

        expect(savedResult.props.id).toBe(wallet.props.id);
        expect(savedResult.props.address).toBe(wallet.props.address);

        wallets = await consumerRepo.getAllCryptoWalletsForConsumer(consumer.props.id);
        expect(wallets).toHaveLength(1);
        expect(wallets[0].props).toStrictEqual(savedResult.props);
      });

      it("should throw error when wallet with duplicate address is added", async () => {
        const consumer = getRandomUser();
        await consumerRepo.createConsumer(consumer);
        const wallet = getRandomCryptoWallet(consumer.props.id);
        await consumerRepo.addCryptoWallet(wallet);

        const newWallet = getRandomCryptoWallet(consumer.props.id);
        newWallet.props.address = wallet.props.address;

        expect(async () => await consumerRepo.addCryptoWallet(newWallet)).rejects.toThrow(BadRequestError);
      });
    });

    describe("getCryptoWalletForConsumer", () => {
      it("should return null if crypto wallet does not exist for consumer", async () => {
        const consumer = getRandomUser();
        await consumerRepo.createConsumer(consumer);
        const wallet = getRandomCryptoWallet(consumer.props.id);
        await consumerRepo.addCryptoWallet(wallet);

        const walletID = "fake-wallet-id";

        const requestedWallet = await consumerRepo.getCryptoWalletForConsumer(walletID, consumer.props.id);
        expect(requestedWallet).toBeNull();
      });

      it("should return requested crypto wallet", async () => {
        const consumer = getRandomUser();
        await consumerRepo.createConsumer(consumer);
        const wallet = getRandomCryptoWallet(consumer.props.id);
        await consumerRepo.addCryptoWallet(wallet);

        const requestedWallet = await consumerRepo.getCryptoWalletForConsumer(wallet.props.id, consumer.props.id);
        expect(requestedWallet).not.toBeNull();
        expect(requestedWallet.props.address).toBe(wallet.props.address);
      });
    });

    describe("getAllCryptoWalletsForConsumer", async () => {
      it("should return empty list if no crypto wallet exists for consumer", async () => {
        const consumer = getRandomUser();
        await consumerRepo.createConsumer(consumer);

        const allWallets = await consumerRepo.getAllCryptoWalletsForConsumer(consumer.props.id);

        expect(allWallets).toHaveLength(0);
      });

      it("should return empty list if consumer does not exist", async () => {
        const consumerID = "fake-consumer-id";
        const allWallets = await consumerRepo.getAllCryptoWalletsForConsumer(consumerID);

        expect(allWallets).toHaveLength(0);
      });

      it("should return all non DELETED crypto wallets for consumer", async () => {
        const consumer = getRandomUser();
        await consumerRepo.createConsumer(consumer);

        const wallet1 = getRandomCryptoWallet(consumer.props.id);
        const wallet2 = getRandomCryptoWallet(consumer.props.id);

        await consumerRepo.addCryptoWallet(wallet1);
        let allWallets = await consumerRepo.getAllCryptoWalletsForConsumer(consumer.props.id);
        expect(allWallets).toHaveLength(1);

        await consumerRepo.addCryptoWallet(wallet2);
        allWallets = await consumerRepo.getAllCryptoWalletsForConsumer(consumer.props.id);
        expect(allWallets).toHaveLength(2);

        const wallet3 = getRandomCryptoWallet(consumer.props.id);
        wallet3.props.status = WalletStatus.DELETED;
        await consumerRepo.addCryptoWallet(wallet3);

        allWallets = await consumerRepo.getAllCryptoWalletsForConsumer(consumer.props.id);
        expect(allWallets).toHaveLength(2);
      });
    });

    describe("updateCryptoWallet", () => {
      it("should not throw error if we try to update to a duplicate address as address input is rejected", async () => {
        const consumer1 = getRandomUser();
        await consumerRepo.createConsumer(consumer1);
        const wallet1 = getRandomCryptoWallet(consumer1.props.id);
        await consumerRepo.addCryptoWallet(wallet1);

        const consumer2 = getRandomUser();
        const wallet2 = getRandomCryptoWallet(consumer2.props.id);
        await consumerRepo.createConsumer(consumer2);
        await consumerRepo.addCryptoWallet(wallet2);

        const allWallets = await consumerRepo.getAllCryptoWalletsForConsumer(consumer2.props.id);
        expect(allWallets).toHaveLength(1);
        expect(allWallets[0].props.address).toBe(wallet2.props.address);

        const updateWallet: Partial<CryptoWalletProps> = {
          id: wallet2.props.id,
          address: wallet1.props.address,
          name: "New Fake Wallet",
        };

        const updatedWallet = await consumerRepo.updateCryptoWallet(wallet2.props.id, updateWallet);
        expect(updatedWallet.props.address).toBe(wallet2.props.address); // address change request is ignored
        expect(updatedWallet.props.name).toBe("New Fake Wallet");
      });

      it("should update status and risk score of crypto wallet", async () => {
        const consumer = getRandomUser();
        const wallet = getRandomCryptoWallet(consumer.props.id);
        await consumerRepo.createConsumer(consumer);
        await consumerRepo.addCryptoWallet(wallet);

        const allWallets = await consumerRepo.getAllCryptoWalletsForConsumer(consumer.props.id);
        expect(allWallets).toHaveLength(1);
        expect(allWallets[0].props.address).toBe(wallet.props.address);
        expect(allWallets[0].props.status).toBe(WalletStatus.PENDING);
        expect(allWallets[0].props.riskScore).toBe(null);

        const updateWallet: Partial<CryptoWalletProps> = {
          id: wallet.props.id,
          status: WalletStatus.APPROVED,
          riskScore: 2.0,
        };

        const updatedWallet = await consumerRepo.updateCryptoWallet(wallet.props.id, updateWallet);

        expect(updatedWallet.props.status).toBe(WalletStatus.APPROVED);
        expect(updatedWallet.props.riskScore).toBe(2.0);
      });
    });
  });

  describe("isHandleTaken", () => {
    it("should return 'true' if there already exist an user with same handle", async () => {
      const consumer = getRandomUser();
      await consumerRepo.createConsumer(consumer);

      const result = await consumerRepo.isHandleTaken(consumer.props.handle);
      expect(result).toBe(true);
    });

    it("should return 'false' if there isn't an user with same handle", async () => {
      const consumer = getRandomUser();
      await consumerRepo.createConsumer(consumer);

      const result = await consumerRepo.isHandleTaken("new_handle");
      expect(result).toBe(false);
    });
  });
});

const getRandomUser = (): Consumer => {
  const email = `${uuid()}_${new Date().valueOf()}@noba.com`;
  const props: Partial<ConsumerProps> = {
    id: `${uuid()}_${new Date().valueOf()}`,
    firstName: "firstName",
    lastName: "lastName",
    email: email,
    displayEmail: email.toUpperCase(),
    phone: getRandomPhoneNumber(),
  };
  return Consumer.createConsumer(props);
};

const getRandomPhoneNumber = (): string => {
  return `+1${Math.floor(Math.random() * 1000000000)}`;
};

const getRandomCryptoWallet = (consumerID: string): CryptoWallet => {
  const props: CryptoWalletProps = {
    id: `${uuid()}_${new Date().valueOf()}`,
    address: uuid().split("-").join(""),
    name: "Fake Wallet",
    chainType: "Ethereum",
    isEVMCompatible: true,
    status: WalletStatus.PENDING,
    consumerID: consumerID,
  };
  return CryptoWallet.createCryptoWallet(props);
};
