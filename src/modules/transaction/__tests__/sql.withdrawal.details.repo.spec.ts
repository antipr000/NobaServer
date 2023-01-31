import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { IWithdrawalDetailsRepo } from "../repo/withdrawal.details.repo";
import { KmsService } from "../../../modules/common/kms.service";
import { SQLWithdrawalDetailsRepo } from "../repo/sql.withdrawal.details.repo";
import { anything, instance, when } from "ts-mockito";
import { getMockKMSServiceWithDefaults } from "../../../modules/common/mocks/mock.kms.service";
import { InputTransaction, WorkflowName } from "../domain/Transaction";
import { uuid } from "uuidv4";
import { createTestConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { AccountType, DocumentType, InputWithdrawalDetails } from "../domain/WithdrawalDetails";
import { KmsKeyType } from "../../../config/configtypes/KmsConfigs";
import { ServiceException } from "../../../core/exception/ServiceException";

describe("SQLWithdrawalDetailsRepo tests", () => {
  jest.setTimeout(20000);

  let withdrawalDetailsRepo: IWithdrawalDetailsRepo;
  let kmsService: KmsService;
  let prismaService: PrismaService;
  let app: TestingModule;

  beforeAll(async () => {
    kmsService = getMockKMSServiceWithDefaults();
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
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        SQLWithdrawalDetailsRepo,
        PrismaService,
        {
          provide: KmsService,
          useFactory: () => instance(kmsService),
        },
      ],
    }).compile();

    withdrawalDetailsRepo = app.get<SQLWithdrawalDetailsRepo>(SQLWithdrawalDetailsRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.consumer.deleteMany();
    await prismaService.transaction.deleteMany();
    await prismaService.withdrawalDetails.deleteMany();
    await app.close();
  });

  describe("addWithdrawalDetails", () => {
    it("should create withdrawal details", async () => {
      const transactionID = await createFakeTransaction(prismaService);
      const inputWithdrawalDetails = createFakeWithdrawalDetails(transactionID);

      when(kmsService.encryptString(anything(), KmsKeyType.SSN)).thenResolve("encrypted-account-number");

      const withdrawalDetails = await withdrawalDetailsRepo.addWithdrawalDetails(inputWithdrawalDetails);

      expect(withdrawalDetails.accountNumber).toBe("encrypted-account-number");
      expect(withdrawalDetails.transactionID).toBe(transactionID);
      expect(withdrawalDetails.bankCode).toBe(inputWithdrawalDetails.bankCode);
    });

    it("should throw error if validation fails", async () => {
      const transactionID = await createFakeTransaction(prismaService);
      const inputWithdrawalDetails = createFakeWithdrawalDetails(transactionID);

      delete inputWithdrawalDetails.accountNumber;

      await expect(withdrawalDetailsRepo.addWithdrawalDetails(inputWithdrawalDetails)).rejects.toThrowError();
    });

    it("should throw ServiceException if transactionID is invalid", async () => {
      const inputWithdrawalDetails = createFakeWithdrawalDetails("invalid-transaction-id");

      await expect(withdrawalDetailsRepo.addWithdrawalDetails(inputWithdrawalDetails)).rejects.toThrow(
        ServiceException,
      );
    });
  });

  describe("getWithdrawalDetails", () => {
    it("should get withdrawal details", async () => {
      const transactionID = await createFakeTransaction(prismaService);
      const inputWithdrawalDetails = createFakeWithdrawalDetails(transactionID);

      when(kmsService.encryptString(anything(), KmsKeyType.SSN)).thenResolve("encrypted-account-number");

      await withdrawalDetailsRepo.addWithdrawalDetails(inputWithdrawalDetails);

      const withdrawalDetails = await withdrawalDetailsRepo.getWithdrawalDetailsByTransactionID(transactionID);

      expect(withdrawalDetails.accountNumber).toBe("encrypted-account-number");
      expect(withdrawalDetails.transactionID).toBe(transactionID);
      expect(withdrawalDetails.bankCode).toBe(inputWithdrawalDetails.bankCode);
    });

    it("should return null if withdrawal details not found", async () => {
      const transactionID = await createFakeTransaction(prismaService);
      const withdrawalDetails = await withdrawalDetailsRepo.getWithdrawalDetailsByTransactionID(transactionID);

      expect(withdrawalDetails).toBeNull();
    });
  });
});

function createFakeWithdrawalDetails(transactionID: string): InputWithdrawalDetails {
  return {
    transactionID: transactionID,
    bankCode: "fake-bank-code",
    accountNumber: "1234567890",
    accountType: AccountType.SAVINGS,
    documentNumber: "1234567890",
    documentType: DocumentType.CC,
  };
}

const getRandomTransaction = (consumerID: string): InputTransaction => {
  const transaction: InputTransaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    memo: "New transaction",
    sessionKey: uuid(),
    workflowName: WorkflowName.WALLET_DEPOSIT,
    debitAmount: 100,
    debitCurrency: "USD",
    debitConsumerID: consumerID,
  };

  return transaction;
};

const createFakeTransaction = async (prismaService: PrismaService): Promise<string> => {
  const consumerID = await createTestConsumer(prismaService);
  const transaction = getRandomTransaction(consumerID);
  const savedTransaction = await prismaService.transaction.create({
    data: transaction,
  });
  return savedTransaction.id;
};