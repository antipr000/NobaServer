import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { anyString, deepEqual, instance, when } from "ts-mockito";
import { CircleClient } from "../circle.client";
import { CircleService } from "../circle.service";
import { getMockCircleClientWithDefaults } from "../mocks/mock.circle.client";
import { ICircleRepo } from "../../repos/circle.repo";
import { getMockCircleRepoWithDefaults } from "../../repos/mocks/mock.circle.repo";
import { Result } from "../../../../core/logic/Result";
import { Circle } from "../../../psp/domain/Circle";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { CircleWithdrawalStatus } from "../../../psp/domain/CircleTypes";
import { HealthCheckStatus } from "../../../../core/domain/HealthCheckTypes";

describe("CircleService", () => {
  let circleService: CircleService;
  let circleClient: CircleClient;
  let circleRepo: ICircleRepo;

  jest.setTimeout(30000);

  beforeEach(async () => {
    circleClient = getMockCircleClientWithDefaults();
    circleRepo = getMockCircleRepoWithDefaults();

    const CircleRepoProvider = {
      provide: "CircleRepo",
      useFactory: () => instance(circleRepo),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: CircleClient,
          useFactory: () => instance(circleClient),
        },
        CircleRepoProvider,
        CircleService,
      ],
    }).compile();

    circleService = app.get<CircleService>(CircleService);
  });

  describe("checkCircleHealth", () => {
    it("should return true when circle client is working", async () => {
      when(circleClient.getHealth()).thenResolve({ status: HealthCheckStatus.OK });
      const result = await circleService.checkCircleHealth();
      expect(result.status).toEqual(HealthCheckStatus.OK);
    });

    it("should return false", async () => {
      when(circleClient.getHealth()).thenResolve({ status: HealthCheckStatus.UNAVAILABLE });
      const result = await circleService.checkCircleHealth();
      expect(result.status).toEqual(HealthCheckStatus.UNAVAILABLE);
    });
  });

  describe("getOrCreateWallet", () => {
    it("should return a wallet id", async () => {
      when(circleRepo.getCircleWalletID("consumerID")).thenResolve(Result.ok("walletID"));

      const walletId = await circleService.getOrCreateWallet("consumerID");
      expect(walletId).toEqual("walletID");
    });

    it("should create a wallet id", async () => {
      when(circleRepo.getCircleWalletID("consumerID")).thenResolve(Result.fail("Wallet not found"));
      when(circleClient.createWallet(anyString())).thenResolve("walletID");
      when(circleRepo.addConsumerCircleWalletID("consumerID", "walletID")).thenResolve(
        Circle.createCircle({ consumerID: "consumerID", walletID: "walletID" }),
      );
      const walletId = await circleService.getOrCreateWallet("consumerID");
      expect(walletId).toEqual("walletID");
    });

    it("should throw an error when consumerID is empty", async () => {
      await expect(circleService.getOrCreateWallet("")).rejects.toThrow(ServiceException);
    });

    it("should throw an error when linking Circle wallet to consumer", async () => {
      when(circleRepo.getCircleWalletID("consumerID")).thenResolve(Result.fail("Wallet not found"));
      when(circleClient.createWallet(anyString())).thenResolve("walletID");
      when(circleRepo.addConsumerCircleWalletID("consumerID", "walletID")).thenThrow();
      await expect(circleService.getOrCreateWallet("consumerID")).rejects.toThrow(ServiceException);
    });
  });

  describe("getMasterWalletID", () => {
    it("should return a master wallet id", async () => {
      when(circleClient.getMasterWalletID()).thenResolve("masterWalletID");
      const masterWalletID = await circleService.getMasterWalletID();
      expect(masterWalletID).toEqual("masterWalletID");
    });

    it("should throw an error when consumerID is empty", async () => {
      when(circleClient.getMasterWalletID()).thenResolve("");
      await expect(circleService.getMasterWalletID()).rejects.toThrow(ServiceException);
    });
  });

  describe("getWalletBalance", () => {
    it("should return a wallet balance", async () => {
      when(circleClient.getWalletBalance("walletID")).thenResolve(100);
      const walletBalance = await circleService.getWalletBalance("walletID");
      expect(walletBalance).toEqual(100);
    });

    it("should throw an error when walletID is empty", async () => {
      await expect(circleService.getWalletBalance("")).rejects.toThrow(ServiceException);
    });
  });

  describe("debitWalletBalance", () => {
    it("should debit a wallet balance", async () => {
      const circleResponse = {
        id: "transferID",
        status: CircleWithdrawalStatus.SUCCESS,
        createdAt: "dateNow",
      };

      when(circleClient.getMasterWalletID()).thenResolve("masterWalletID");
      when(circleClient.getWalletBalance("walletID")).thenResolve(200);
      when(
        circleClient.transfer(
          deepEqual({
            idempotencyKey: "workflowID",
            sourceWalletID: "walletID",
            destinationWalletID: "masterWalletID",
            amount: 100,
          }),
        ),
      ).thenResolve({
        id: "transferID",
        status: CircleWithdrawalStatus.SUCCESS,
        createdAt: "dateNow",
      });
      const walletBalanceResponse = await circleService.debitWalletBalance("workflowID", "walletID", 100);
      expect(walletBalanceResponse).toEqual(circleResponse);
    });

    it("should throw an error when walletID is empty", async () => {
      await expect(circleService.debitWalletBalance("workflowID", "", 100)).rejects.toThrow(ServiceException);
    });

    it("should throw an error when amount is 0", async () => {
      await expect(circleService.debitWalletBalance("workflowID", "walletID", 0)).rejects.toThrow(ServiceException);
    });

    it("should throw an error when amount is negative", async () => {
      await expect(circleService.debitWalletBalance("workflowID", "walletID", -100)).rejects.toThrow(ServiceException);
    });

    it("should throw an error when transfer fails", async () => {
      when(circleClient.getMasterWalletID()).thenResolve("masterWalletID");
      when(circleClient.getWalletBalance("walletID")).thenResolve(200);
      when(
        circleClient.transfer(
          deepEqual({
            idempotencyKey: "workflowID",
            sourceWalletID: "walletID",
            destinationWalletID: "masterWalletID",
            amount: 100,
          }),
        ),
      ).thenThrow(new ServiceException({ errorCode: ServiceErrorCode.UNKNOWN }));
      await expect(circleService.debitWalletBalance("workflowID", "walletID", 100)).rejects.toThrow(ServiceException);
    });

    it("should throw an error when master wallet id is empty", async () => {
      when(circleClient.getWalletBalance("walletID")).thenResolve(200);
      when(circleClient.getMasterWalletID()).thenThrow(
        new ServiceException({ errorCode: ServiceErrorCode.DOES_NOT_EXIST }),
      );
      await expect(circleService.debitWalletBalance("workflowID", "walletID", 100)).rejects.toThrow(ServiceException);
    });
  });

  describe("creditWalletBalance", () => {
    it("should credit a wallet balance", async () => {
      const circleResponse = {
        id: "transferID",
        status: CircleWithdrawalStatus.SUCCESS,
        createdAt: "dateNow",
      };

      when(circleClient.getMasterWalletID()).thenResolve("masterWalletID");
      when(circleClient.getWalletBalance("masterWalletID")).thenResolve(200);
      when(
        circleClient.transfer(
          deepEqual({
            idempotencyKey: "workflowID",
            sourceWalletID: "masterWalletID",
            destinationWalletID: "walletID",
            amount: 100,
          }),
        ),
      ).thenResolve({
        id: "transferID",
        status: CircleWithdrawalStatus.SUCCESS,
        createdAt: "dateNow",
      });
      const walletBalanceResponse = await circleService.creditWalletBalance("workflowID", "walletID", 100);
      expect(walletBalanceResponse).toEqual(circleResponse);
    });

    it("should throw an error when walletID is empty", async () => {
      await expect(circleService.creditWalletBalance("workflowID", "", 100)).rejects.toThrow(ServiceException);
    });

    it("should throw an error when amount is 0", async () => {
      await expect(circleService.creditWalletBalance("workflowID", "walletID", 0)).rejects.toThrow(ServiceException);
    });

    it("should throw an error when amount is negative", async () => {
      await expect(circleService.creditWalletBalance("workflowID", "walletID", -100)).rejects.toThrow(ServiceException);
    });

    it("should throw an error when transfer fails", async () => {
      when(circleClient.getMasterWalletID()).thenResolve("masterWalletID");
      when(circleClient.getWalletBalance("masterWalletID")).thenResolve(200);
      when(
        circleClient.transfer(
          deepEqual({
            idempotencyKey: "workflowID",
            sourceWalletID: "masterWalletID",
            destinationWalletID: "walletID",
            amount: 100,
          }),
        ),
      ).thenThrow(new ServiceException({ errorCode: ServiceErrorCode.UNKNOWN }));
      await expect(circleService.creditWalletBalance("workflowID", "walletID", 100)).rejects.toThrow(ServiceException);
    });

    it("should throw an error when master wallet doesn't have enough funds", async () => {
      when(circleClient.getMasterWalletID()).thenResolve("masterWalletID");
      when(circleClient.getWalletBalance("masterWalletID")).thenResolve(1);
      when(
        circleClient.transfer(
          deepEqual({
            idempotencyKey: "workflowID",
            sourceWalletID: "masterWalletID",
            destinationWalletID: "walletID",
            amount: 100,
          }),
        ),
      ).thenThrow(new ServiceException({ errorCode: ServiceErrorCode.UNKNOWN }));
      await expect(circleService.creditWalletBalance("workflowID", "walletID", 100)).rejects.toThrow(ServiceException);
    });

    it("should throw an error when master wallet id is empty", async () => {
      when(circleClient.getMasterWalletID()).thenThrow(
        new ServiceException({ errorCode: ServiceErrorCode.DOES_NOT_EXIST }),
      );
      await expect(circleService.creditWalletBalance("workflowID", "walletID", 100)).rejects.toThrow(ServiceException);
    });
  });
});
