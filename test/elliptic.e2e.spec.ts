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
import { setUpEnvironmentVariablesToLoadTheSourceCode } from "./setup";
const port: number = setUpEnvironmentVariablesToLoadTheSourceCode();

import { EllipticService } from "../src/modules/common/elliptic.service";
import { Transaction } from "../src/modules/transactions/domain/Transaction";
import { TransactionStatus } from "../src/modules/transactions/domain/Types";
import * as ConfigurationUtils from "../src/config/ConfigurationUtils";
import { IntegrationTestUtility } from "./TestUtils";

describe.skip("Elliptic Integration Test", () => {
  jest.setTimeout(20000);

  let ellipticService: EllipticService;
  let integrationTestUtils: IntegrationTestUtility;

  beforeAll(async () => {
    integrationTestUtils = await IntegrationTestUtility.setUp(port);
    ellipticService = (await integrationTestUtils.getApp()).get<EllipticService>(EllipticService);
  });

  afterAll(async () => {
    await integrationTestUtils.tearDown();
  });

  afterEach(async () => {
    await integrationTestUtils.reset();
  });

  it("should call elliptic and return risk score", async () => {
    jest.spyOn(ConfigurationUtils, "isProductionEnvironment").mockImplementation(() => true);
    const transaction: Transaction = Transaction.createTransaction({
      _id: "1111111111",
      userId: "fake-consumer",
      sessionKey: "fake-session",
      transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
      fiatPaymentInfo: {
        paymentMethodID: "fake-payment-method",
        isCompleted: false,
        isApproved: false,
        isFailed: false,
        details: [],
        paymentProvider: "Checkout" as any,
      },
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ALGO",
      destinationWalletAddress: "GX3XLHSRMFTADVKJBBQBTZ6BKINW6ZO5JHXWGCWB4CPDNPDQ2PIYN4AVHQ",
      blockchainTransactionId: "2NF4ETR2TQPVLLELQNJDBGRWJOJ3CH6BR4HEZWRI5V2OK5LPVTKQ",
    });

    const response = await ellipticService.transactionAnalysis(transaction);
    expect(response.riskScore).toBe(null);
  });
});
