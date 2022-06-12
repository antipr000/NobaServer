import { Test, TestingModule } from "@nestjs/testing";
import { MongoDBTransactionRepo } from "../MongoDBTransactionRepo";
import { TransactionModel } from "../../../../infra/mongodb/models/TransactionModel";
import { getWinstonModule } from "../../../../core/utils/WinstonModule";
import { getAppConfigModule } from "../../../../core/utils/AppConfigModule";
import { DBProvider } from "../../../../infraproviders/DBProvider";
import { Transaction, TransactionProps } from "../../domain/Transaction";
import { TransactionStatus } from "../../domain/Types";

import * as Mongoose from "mongoose";

describe("MongoDBTransactionRepo tests", () => {
  jest.setTimeout(30000);
  const OLD_ENV = process.env;

  let transactionRepo: MongoDBTransactionRepo;

  let dummmyTransaction: TransactionProps;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };
    const module: TestingModule = await Test.createTestingModule({
      imports: [getWinstonModule(), getAppConfigModule()],
      providers: [DBProvider],
    }).compile();

    const dbProvider: DBProvider = module.get<DBProvider>(DBProvider);
    transactionRepo = new MongoDBTransactionRepo(dbProvider);

    dummmyTransaction = {
      _id: "transaction_1",
      userId: "user01",
      leg1: "leg1-1234",
      leg2: "leg2-1234",
      leg1Amount: 0,
      leg2Amount: 0,
      paymentMethodId: "payment01",
      transactionStatus: TransactionStatus.INITIATED,
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("All transaction operations", () => {
    beforeAll(done => {
      done();
    });

    afterAll(async done => {
      Mongoose.connection.close();
      done();
    });

    it("should be able to do all transaction operations", async () => {
      // Creating a transaction
      const transaction = Transaction.createTransaction(dummmyTransaction);
      await transactionRepo.createTransaction(transaction);

      const transactionResult = await transactionRepo.getTransaction(dummmyTransaction._id);

      const userTransactions = await transactionRepo.getUserTransactions(dummmyTransaction.userId);

      // Remove dummy transaction
      await TransactionModel.findByIdAndDelete(dummmyTransaction._id);

      // assertions
      expect(userTransactions.length).toBe(1);
      expect(userTransactions[0]).toStrictEqual(transactionResult);
      expect(transactionResult.props._id).toBe(dummmyTransaction._id);
      expect(transactionResult.props.userId).toBe(dummmyTransaction.userId);
    });
  });
});
