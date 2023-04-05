import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { anyString, deepEqual, instance, when } from "ts-mockito";
import { CircleClient } from "../circle.client";
import { CircleService } from "../circle.service";
import { getMockCircleClientWithDefaults } from "../mocks/mock.circle.client";
import { getMockCircleRepoWithDefaults } from "../mocks/mock.circle.repo";
import { ICircleRepo } from "../repos/circle.repo";
import { HealthCheckStatus } from "../../../../core/domain/HealthCheckTypes";
import { Circle } from "../../domain/Circle";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { Result } from "../../../../core/logic/Result";
import { CircleWithdrawalStatus } from "../../domain/CircleTypes";

describe("CircleService", () => {
  let circleService: CircleService;
  let mockCircleClient: CircleClient;
  let mockCircleRepo: ICircleRepo;

  jest.setTimeout(30000);

  beforeEach(async () => {
    mockCircleClient = getMockCircleClientWithDefaults();
    mockCircleRepo = getMockCircleRepoWithDefaults();

    const CircleRepoProvider = {
      provide: "CircleRepo",
      useFactory: () => instance(mockCircleRepo),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: CircleClient,
          useFactory: () => instance(mockCircleClient),
        },
        CircleRepoProvider,
        CircleService,
      ],
    }).compile();

    circleService = app.get<CircleService>(CircleService);
  });

  describe("checkCircleHealth", () => {
    it("should return true when circle client is working", async () => {
      when(mockCircleClient.getHealth()).thenResolve({ status: HealthCheckStatus.OK });
      const result = await circleService.checkCircleHealth();
      expect(result.status).toEqual(HealthCheckStatus.OK);
    });

    it("should return false", async () => {
      when(mockCircleClient.getHealth()).thenResolve({ status: HealthCheckStatus.UNAVAILABLE });
      const result = await circleService.checkCircleHealth();
      expect(result.status).toEqual(HealthCheckStatus.UNAVAILABLE);
    });
  });

  describe("getOrCreateWallet", () => {
    it("should return a wallet id", async () => {
      when(mockCircleRepo.getCircleWalletID("consumerID")).thenResolve(Result.ok("walletID"));

      const walletId = await circleService.getOrCreateWallet("consumerID");
      expect(walletId).toEqual("walletID");
    });

    it("should create a wallet id", async () => {
      when(mockCircleRepo.getCircleWalletID("consumerID")).thenResolve(Result.fail("Wallet not found"));
      when(mockCircleClient.createWallet(anyString())).thenResolve("walletID");
      when(mockCircleRepo.addConsumerCircleWalletID("consumerID", "walletID")).thenResolve(
        Circle.createCircle({ consumerID: "consumerID", walletID: "walletID" }),
      );
      const walletId = await circleService.getOrCreateWallet("consumerID");
      expect(walletId).toEqual("walletID");
    });

    it("should throw an error when consumerID is empty", async () => {
      expect(circleService.getOrCreateWallet("")).rejects.toThrowServiceException();
    });

    it("should throw an error when linking Circle wallet to consumer", async () => {
      when(mockCircleRepo.getCircleWalletID("consumerID")).thenResolve(Result.fail("Wallet not found"));
      when(mockCircleClient.createWallet(anyString())).thenResolve("walletID");
      when(mockCircleRepo.addConsumerCircleWalletID("consumerID", "walletID")).thenThrow();
      expect(circleService.getOrCreateWallet("consumerID")).rejects.toThrowServiceException();
    });

    it("should throw service exception when consumer wallet could not be linked", async () => {
      when(mockCircleRepo.getCircleWalletID("consumerID")).thenResolve(Result.fail("Wallet not found"));
      when(mockCircleClient.createWallet(anyString())).thenResolve("walletID");
      when(mockCircleRepo.addConsumerCircleWalletID("consumerID", "walletID")).thenThrow();
      expect(circleService.getOrCreateWallet("consumerID")).rejects.toThrowServiceException(ServiceErrorCode.UNKNOWN);
    });
  });

  describe("getMasterWalletID", () => {
    it("should return a master wallet id", async () => {
      when(mockCircleClient.getMasterWalletID()).thenResolve("masterWalletID");
      const masterWalletID = await circleService.getMasterWalletID();
      expect(masterWalletID).toEqual("masterWalletID");
    });

    it("should throw an error when consumerID is empty", async () => {
      when(mockCircleClient.getMasterWalletID()).thenResolve("");
      expect(circleService.getMasterWalletID()).rejects.toThrowServiceException();
    });
  });

  describe("getWalletBalance", () => {
    it("should return a wallet balance", async () => {
      when(mockCircleClient.getWalletBalance("walletID")).thenResolve(100);
      const walletBalance = await circleService.getWalletBalance("walletID");
      expect(walletBalance).toEqual(100);
    });

    it("should throw an error when walletID is empty", async () => {
      expect(circleService.getWalletBalance("")).rejects.toThrowServiceException();
    });
  });

  describe("debitWalletBalance", () => {
    it("should debit a wallet balance", async () => {
      const circleResponse = {
        id: "transferID",
        status: CircleWithdrawalStatus.SUCCESS,
        createdAt: "dateNow",
      };

      when(mockCircleClient.getMasterWalletID()).thenResolve("masterWalletID");
      when(mockCircleClient.getWalletBalance("walletID")).thenResolve(200);
      when(
        mockCircleClient.transfer(
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
      expect(circleService.debitWalletBalance("workflowID", "", 100)).rejects.toThrowServiceException();
    });

    it("should throw an error when amount is 0", async () => {
      expect(circleService.debitWalletBalance("workflowID", "walletID", 0)).rejects.toThrowServiceException();
    });

    it("should throw an error when amount is negative", async () => {
      expect(circleService.debitWalletBalance("workflowID", "walletID", -100)).rejects.toThrowServiceException();
    });

    it("should throw an error when wallet balance is insufficient", async () => {
      when(mockCircleClient.getWalletBalance("walletID")).thenResolve(50);
      expect(circleService.debitWalletBalance("workflowID", "walletID", 100)).rejects.toThrowServiceException();
    });

    it("should throw an error when transfer fails", async () => {
      when(mockCircleClient.getMasterWalletID()).thenResolve("masterWalletID");
      when(mockCircleClient.getWalletBalance("walletID")).thenResolve(200);
      when(
        mockCircleClient.transfer(
          deepEqual({
            idempotencyKey: "workflowID",
            sourceWalletID: "walletID",
            destinationWalletID: "masterWalletID",
            amount: 100,
          }),
        ),
      ).thenThrow(new ServiceException({ errorCode: ServiceErrorCode.UNKNOWN }));
      expect(circleService.debitWalletBalance("workflowID", "walletID", 100)).rejects.toThrowServiceException();
    });

    it("should throw an error when master wallet id is empty", async () => {
      when(mockCircleClient.getWalletBalance("walletID")).thenResolve(200);
      when(mockCircleClient.getMasterWalletID()).thenThrow(
        new ServiceException({ errorCode: ServiceErrorCode.DOES_NOT_EXIST }),
      );
      expect(circleService.debitWalletBalance("workflowID", "walletID", 100)).rejects.toThrowServiceException();
    });
  });

  describe("creditWalletBalance", () => {
    it("should credit a wallet balance", async () => {
      const circleResponse = {
        id: "transferID",
        status: CircleWithdrawalStatus.SUCCESS,
        createdAt: "dateNow",
      };

      when(mockCircleClient.getMasterWalletID()).thenResolve("masterWalletID");
      when(mockCircleClient.getWalletBalance("masterWalletID")).thenResolve(200);
      when(
        mockCircleClient.transfer(
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
      expect(circleService.creditWalletBalance("workflowID", "", 100)).rejects.toThrowServiceException();
    });

    it("should throw an error when amount is 0", async () => {
      expect(circleService.creditWalletBalance("workflowID", "walletID", 0)).rejects.toThrowServiceException();
    });

    it("should throw an error when amount is negative", async () => {
      expect(circleService.creditWalletBalance("workflowID", "walletID", -100)).rejects.toThrowServiceException();
    });

    it("should throw an error when transfer fails", async () => {
      when(mockCircleClient.getMasterWalletID()).thenResolve("masterWalletID");
      when(mockCircleClient.getWalletBalance("masterWalletID")).thenResolve(200);
      when(
        mockCircleClient.transfer(
          deepEqual({
            idempotencyKey: "workflowID",
            sourceWalletID: "masterWalletID",
            destinationWalletID: "walletID",
            amount: 100,
          }),
        ),
      ).thenThrow(new ServiceException({ errorCode: ServiceErrorCode.UNKNOWN }));
      expect(circleService.creditWalletBalance("workflowID", "walletID", 100)).rejects.toThrowServiceException();
    });

    it("should throw an error when master wallet doesn't have enough funds", async () => {
      when(mockCircleClient.getMasterWalletID()).thenResolve("masterWalletID");
      when(mockCircleClient.getWalletBalance("masterWalletID")).thenResolve(1);
      when(
        mockCircleClient.transfer(
          deepEqual({
            idempotencyKey: "workflowID",
            sourceWalletID: "masterWalletID",
            destinationWalletID: "walletID",
            amount: 100,
          }),
        ),
      ).thenThrow(new ServiceException({ errorCode: ServiceErrorCode.UNKNOWN }));
      expect(circleService.creditWalletBalance("workflowID", "walletID", 100)).rejects.toThrowServiceException();
    });

    it("should throw an error when master wallet id is empty", async () => {
      when(mockCircleClient.getMasterWalletID()).thenThrow(
        new ServiceException({ errorCode: ServiceErrorCode.DOES_NOT_EXIST }),
      );
      expect(circleService.creditWalletBalance("workflowID", "walletID", 100)).rejects.toThrowServiceException();
    });
  });

  describe("transferFunds", () => {
    it("should throw error when source wallet is empty", async () => {
      expect(
        circleService.transferFunds("idempotency-key", "", "destinationWalletID", 100),
      ).rejects.toThrowServiceException();
    });

    it("should throw error when destination wallet is empty", async () => {
      expect(
        circleService.transferFunds("idempotency-key", "sourceWalletID", "", 100),
      ).rejects.toThrowServiceException();
    });

    it("should throw error when amount is 0", async () => {
      expect(
        circleService.transferFunds("idempotency-key", "sourceWalletID", "destinationWalletID", 0),
      ).rejects.toThrowServiceException();
    });

    it("should throw error when amount is negative", async () => {
      expect(
        circleService.transferFunds("idempotency-key", "sourceWalletID", "destinationWalletID", -100),
      ).rejects.toThrowServiceException();
    });

    it("should throw error when insufficient funds", async () => {
      when(mockCircleClient.getWalletBalance("sourceWalletID")).thenResolve(1);
      expect(
        circleService.transferFunds("idempotency-key", "sourceWalletID", "destinationWalletID", 100),
      ).rejects.toThrowServiceException();
    });

    it("should throw error when transfer fails", async () => {
      when(mockCircleClient.getWalletBalance("sourceWalletID")).thenResolve(200);
      when(
        mockCircleClient.transfer(
          deepEqual({
            idempotencyKey: "idempotency-key",
            sourceWalletID: "sourceWalletID",
            destinationWalletID: "destinationWalletID",
            amount: 100,
          }),
        ),
      ).thenThrow(new ServiceException({ errorCode: ServiceErrorCode.UNKNOWN }));
      expect(
        circleService.transferFunds("idempotency-key", "sourceWalletID", "destinationWalletID", 100),
      ).rejects.toThrowServiceException();
    });

    it("should transfer funds", async () => {
      when(mockCircleClient.getWalletBalance("sourceWalletID")).thenResolve(200);
      when(
        mockCircleClient.transfer(
          deepEqual({
            idempotencyKey: "idempotency-key",
            sourceWalletID: "sourceWalletID",
            destinationWalletID: "destinationWalletID",
            amount: 100,
          }),
        ),
      ).thenResolve({
        id: "transferID",
        status: CircleWithdrawalStatus.SUCCESS,
        createdAt: "dateNow",
      });
      const transferResponse = await circleService.transferFunds(
        "idempotency-key",
        "sourceWalletID",
        "destinationWalletID",
        100,
      );
      expect(transferResponse).toEqual({
        id: "transferID",
        status: CircleWithdrawalStatus.SUCCESS,
        createdAt: "dateNow",
      });
    });
  });

  describe("getBalance", () => {
    it("should get balance", async () => {
      when(mockCircleClient.getWalletBalance("walletID")).thenResolve(200);
      const balance = await circleService.getBalance("walletID");
      expect(balance).toEqual({ balance: 200, currency: "USD" });
    });

    it("should throw an error when walletID is empty", async () => {
      expect(circleService.getBalance("")).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should throw an error when wallet doesn't exist", async () => {
      when(mockCircleClient.getWalletBalance("walletID")).thenThrow(
        new ServiceException({ errorCode: ServiceErrorCode.UNKNOWN }),
      );
      expect(circleService.getBalance("walletID")).rejects.toThrowServiceException(ServiceErrorCode.UNKNOWN);
    });
  });
});
