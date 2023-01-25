import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance } from "ts-mockito";
import { WalletDepositImpl } from "../factory/wallet.deposit.impl";
import { WalletTransferImpl } from "../factory/wallet.transfer.impl";
import { WalletWithdrawalImpl } from "../factory/wallet.withdrawal.impl";
import { WorkflowFactory } from "../factory/workflow.factory";
import { getMockWalletDepositImplWithDefaults } from "../mocks/mock.wallet.deposit.impl";
import { getMockWalletTransferImplWithDefaults } from "../mocks/mock.wallet.transfer.impl";
import { getMockWalletWithdrawalImplWithDefaults } from "../mocks/mock.wallet.withdrawal.impl";
import { WorkflowName } from "../domain/Transaction";

describe("WorkflowFactory Tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let walletDepositImpl: WalletDepositImpl;
  let walletTransferImpl: WalletTransferImpl;
  let walletWithdrawalImpl: WalletWithdrawalImpl;
  let workflowFactory: WorkflowFactory;

  beforeAll(async () => {
    walletDepositImpl = instance(getMockWalletDepositImplWithDefaults());
    walletTransferImpl = instance(getMockWalletTransferImplWithDefaults());
    walletWithdrawalImpl = instance(getMockWalletWithdrawalImplWithDefaults());
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: WalletDepositImpl,
          useFactory: () => walletDepositImpl,
        },
        {
          provide: WalletTransferImpl,
          useFactory: () => walletTransferImpl,
        },
        {
          provide: WalletWithdrawalImpl,
          useFactory: () => walletWithdrawalImpl,
        },
        WorkflowFactory,
      ],
    }).compile();

    workflowFactory = app.get<WorkflowFactory>(WorkflowFactory);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("getWorkflowImplementation", () => {
    it("should return WalletDepositImpl when workflowName is WALLET_DEPOSIT", () => {
      const workflow = workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_DEPOSIT);
      expect(workflow).toBe(walletDepositImpl);
    });

    it("should return WalletTransferImpl when workflowName is WALLET_TRANSFER", () => {
      const workflow = workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_TRANSFER);
      expect(workflow).toBe(walletTransferImpl);
    });

    it("should return WalletWithdrawalImpl when workflowName is WALLET_WITHDRAWAL", () => {
      const workflow = workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_WITHDRAWAL);
      expect(workflow).toBe(walletWithdrawalImpl);
    });
  });
});
