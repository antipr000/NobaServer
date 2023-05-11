import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { CircleService } from "../../public/circle.service";
import { getMockCircleServiceWithDefaults } from "../../public/mocks/mock.circle.service";
import { CircleWorkflowController } from "../circle.workflow.controller";
import { CircleWithdrawalStatus } from "../../../psp/domain/CircleTypes";
import { EmployerService } from "../../../../modules/employer/employer.service";
import { getMockEmployerServiceWithDefaults } from "../../../../modules/employer/mocks/mock.employer.service";

describe("CircleWorkflowController", () => {
  let circleService: CircleService;
  let employerService: EmployerService;
  let circleWorkflowController: CircleWorkflowController;

  beforeAll(async () => {
    circleService = getMockCircleServiceWithDefaults();
    employerService = getMockEmployerServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync({}), getTestWinstonModule()],
      providers: [
        {
          provide: CircleService,
          useFactory: () => instance(circleService),
        },
        {
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
      ],
      controllers: [CircleWorkflowController],
    }).compile();
    circleWorkflowController = app.get<CircleWorkflowController>(CircleWorkflowController);
  });

  describe("/wallets/:walletID/balance", () => {
    it("should return a wallet balance", async () => {
      when(circleService.getWalletBalance("walletID")).thenResolve(100);
      const result = await circleWorkflowController.getWalletBalance("walletID");
      expect(result).toEqual({ walletID: "walletID", balance: 100 });
    });
  });

  describe("/wallets/consumers/:consumerID", () => {
    it("should return a wallet ID", async () => {
      when(circleService.getOrCreateWallet("consumerID")).thenResolve("walletID");
      const result = await circleWorkflowController.getConsumerWalletID("consumerID");
      expect(result).toEqual({ walletID: "walletID" });
    });
  });

  describe("/wallets/master", () => {
    it("should return a master wallet ID", async () => {
      when(circleService.getMasterWalletID()).thenResolve("walletID");
      const result = await circleWorkflowController.getMasterWalletID();
      expect(result).toEqual({ walletID: "walletID" });
    });
  });

  describe("/wallets/:walletID/debit", () => {
    it("should debit a wallet", async () => {
      when(circleService.debitWalletBalance("workflowID", "walletID", 100)).thenResolve({
        id: "id",
        status: CircleWithdrawalStatus.PENDING,
        createdAt: "createdAt",
      });
      const result = await circleWorkflowController.debitWalletBalance("walletID", {
        workflowID: "workflowID",
        amount: 100,
      });
      expect(result).toEqual({ id: "id", status: CircleWithdrawalStatus.PENDING, createdAt: "createdAt" });
    });
  });

  describe("/wallets/:walletID/credit", () => {
    it("should credit a wallet", async () => {
      when(circleService.creditWalletBalance("workflowID", "walletID", 100)).thenResolve({
        id: "id",
        status: CircleWithdrawalStatus.PENDING,
        createdAt: "createdAt",
      });
      const result = await circleWorkflowController.creditWalletBalance("walletID", {
        workflowID: "workflowID",
        amount: 100,
      });
      expect(result).toEqual({ id: "id", status: CircleWithdrawalStatus.PENDING, createdAt: "createdAt" });
    });
  });

  describe("/wallets/:walletID/transfer", () => {
    it("should transfer funds between wallets", async () => {
      when(circleService.transferFunds("workflowID", "fromWalletID", "toWalletID", 100)).thenResolve({
        id: "id",
        status: CircleWithdrawalStatus.PENDING,
        createdAt: "createdAt",
      });
      const result = await circleWorkflowController.transferFunds("fromWalletID", {
        destinationWalletID: "toWalletID",
        workflowID: "workflowID",
        amount: 100,
      });
      expect(result).toEqual({ id: "id", status: CircleWithdrawalStatus.PENDING, createdAt: "createdAt" });
    });
  });

  describe("getCircleBalanceAfterPayingAllDisbursementForInvoicedPayrolls", () => {
    it("should deduct the allocationAmount and return the balance", async () => {
      when(employerService.getTotalAllocationAmountAcrossInvoicedPayrolls()).thenResolve(11);
      when(circleService.getMasterWalletID()).thenResolve("MASTER_WALLET_ID");
      when(circleService.getWalletBalance("MASTER_WALLET_ID")).thenResolve(100);

      const result = await circleWorkflowController.getCircleBalanceAfterPayingAllDisbursementForInvoicedPayrolls();

      expect(result).toStrictEqual({
        walletID: "MASTER_WALLET_ID",
        balance: 89,
      });
    });
  });
});
