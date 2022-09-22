/**
 * Setup the required environment variables for
 *   - API Client
 *   - Test Configs for different Vendors
 *
 * This is required to be the very first line in
 * the test files (even before other imports) as
 * API Client requires certain environment variables
 * to be set before any of it's class is even
 * imported.
 */
import { setUp } from "./setup";
setUp();

import { INestApplication } from "@nestjs/common";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { bootstrap } from "../src/server";
import { EllipticService } from "../src/modules/common/elliptic.service";
import { Transaction } from "../src/modules/transactions/domain/Transaction";
import { TransactionStatus } from "../src/modules/transactions/domain/Types";

describe("Elliptic Integration Test", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;
  let ellipticService: EllipticService;

  beforeEach(async () => {
    const port = process.env.PORT;

    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();

    const environmentVaraibles = {
      MONGO_URI: mongoUri,
    };
    app = await bootstrap(environmentVaraibles);
    await app.listen(port);
    ellipticService = app.get<EllipticService>(EllipticService);
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await app.close();
    await mongoServer.stop();
  });

  it("should call elliptic and return risk score", async () => {
    const transaction: Transaction = Transaction.createTransaction({
      _id: "1111111111",
      userId: "fake-consumer",
      sessionKey: "fake-session",
      transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
      paymentMethodID: "fake-payment-method",
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ALGO",
      destinationWalletAddress: "GX3XLHSRMFTADVKJBBQBTZ6BKINW6ZO5JHXWGCWB4CPDNPDQ2PIYN4AVHQ",
      partnerID: "12345",
      blockchainTransactionId: "2NF4ETR2TQPVLLELQNJDBGRWJOJ3CH6BR4HEZWRI5V2OK5LPVTKQ",
    });

    const response = await ellipticService.transactionAnalysis(transaction);
    expect(response.riskScore).toBe(null);
  });
});
