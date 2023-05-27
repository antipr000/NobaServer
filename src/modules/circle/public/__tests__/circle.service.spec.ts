import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { CircleClient } from "../circle.client";
import { CircleService } from "../circle.service";
import { getMockCircleClientWithDefaults } from "../mocks/mock.circle.client";
import { HealthCheckStatus } from "../../../../core/domain/HealthCheckTypes";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { Result } from "../../../../core/logic/Result";
import { getMockCircleRepoWithDefaults } from "../../repos/mocks/mock.circle.repo";
import { ICircleRepo } from "../../repos/circle.repo";
import { Circle } from "../../domain/Circle";
import { CircleTransferStatus, TransferResponse } from "../../../../modules/psp/domain/CircleTypes";
import { AlertService } from "../../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../../modules/common/mocks/mock.alert.service";
import { AlertKey } from "../../../../modules/common/alerts/alert.dto";

describe("CircleService", () => {
  let circleService: CircleService;
  let mockCircleClient: CircleClient;
  let mockCircleRepo: ICircleRepo;
  let mockAlertService: AlertService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    mockCircleClient = getMockCircleClientWithDefaults();
    mockCircleRepo = getMockCircleRepoWithDefaults();
    mockAlertService = getMockAlertServiceWithDefaults();

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
        {
          provide: AlertService,
          useFactory: () => instance(mockAlertService),
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
      when(mockCircleClient.getMasterWalletID()).thenReturn("masterWalletID");
      const masterWalletID = circleService.getMasterWalletID();
      expect(masterWalletID).toEqual("masterWalletID");
    });

    it("should throw an error when consumerID is empty", async () => {
      when(mockCircleClient.getMasterWalletID()).thenReturn("");
      try {
        circleService.getMasterWalletID();
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toBe(ServiceErrorCode.DOES_NOT_EXIST);
      }
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
        status: CircleTransferStatus.SUCCESS,
        createdAt: "dateNow",
      };

      when(mockCircleClient.getMasterWalletID()).thenReturn("masterWalletID");
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
        transferID: "transferID",
        amount: 100,
        sourceWalletID: "walletID",
        destinationWalletID: "masterWalletID",
        status: CircleTransferStatus.SUCCESS,
        createdAt: "dateNow",
      });
      when(mockCircleRepo.updateCurrentBalance("walletID", anything())).thenResolve();
      const walletBalanceResponse = await circleService.debitWalletBalance("workflowID", "walletID", 100);
      expect(walletBalanceResponse).toEqual(circleResponse);

      verify(mockCircleRepo.updateCurrentBalance("walletID", 100)).once();
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
      when(mockCircleClient.getMasterWalletID()).thenReturn("masterWalletID");
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
      verify(mockCircleRepo.updateCurrentBalance(anyString(), anything())).never();
    });

    it("should throw an error when master wallet id is empty", async () => {
      when(mockCircleClient.getWalletBalance("walletID")).thenResolve(200);
      when(mockCircleClient.getMasterWalletID()).thenThrow(
        new ServiceException({ errorCode: ServiceErrorCode.DOES_NOT_EXIST }),
      );
      expect(circleService.debitWalletBalance("workflowID", "walletID", 100)).rejects.toThrowServiceException();
      verify(mockCircleRepo.updateCurrentBalance(anyString(), anything())).never();
    });

    it("should not update cached balance when transfer fails", async () => {
      const circleResponse = {
        id: "transferID",
        status: CircleTransferStatus.TRANSFER_FAILED,
        createdAt: "dateNow",
      };

      when(mockCircleClient.getMasterWalletID()).thenReturn("masterWalletID");
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
        transferID: "transferID",
        amount: 100,
        sourceWalletID: "walletID",
        destinationWalletID: "masterWalletID",
        status: CircleTransferStatus.TRANSFER_FAILED,
        createdAt: "dateNow",
      });

      const walletBalanceResponse = await circleService.debitWalletBalance("workflowID", "walletID", 100);
      expect(walletBalanceResponse).toEqual(circleResponse);

      verify(mockCircleRepo.updateCurrentBalance("walletID", anything())).never();
    });
  });

  describe("creditWalletBalance", () => {
    it("should credit a wallet balance", async () => {
      const circleResponse = {
        id: "transferID",
        status: CircleTransferStatus.SUCCESS,
        createdAt: "dateNow",
      };

      when(mockCircleClient.getMasterWalletID()).thenReturn("masterWalletID");
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
        transferID: "transferID",
        amount: 100,
        sourceWalletID: "walletID",
        destinationWalletID: "masterWalletID",
        status: CircleTransferStatus.SUCCESS,
        createdAt: "dateNow",
      });

      when(mockCircleRepo.updateCurrentBalance("walletID", anything())).thenResolve();
      when(mockCircleClient.getWalletBalance("walletID")).thenResolve(300);
      const walletBalanceResponse = await circleService.creditWalletBalance("workflowID", "walletID", 100);
      expect(walletBalanceResponse).toEqual(circleResponse);

      verify(mockCircleRepo.updateCurrentBalance("walletID", 300)).once();
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
      when(mockCircleClient.getMasterWalletID()).thenReturn("masterWalletID");
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
      verify(mockCircleRepo.updateCurrentBalance(anyString(), anything())).never();
    });

    it("should throw an error when master wallet doesn't have enough funds", async () => {
      when(mockCircleClient.getMasterWalletID()).thenReturn("masterWalletID");
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

    it("should not update cached balance when transfer fails", async () => {
      const circleResponse = {
        id: "transferID",
        status: CircleTransferStatus.TRANSFER_FAILED,
        createdAt: "dateNow",
      };

      when(mockCircleClient.getMasterWalletID()).thenReturn("masterWalletID");
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
        transferID: "transferID",
        amount: 100,
        sourceWalletID: "walletID",
        destinationWalletID: "masterWalletID",
        status: CircleTransferStatus.TRANSFER_FAILED,
        createdAt: "dateNow",
      });

      when(mockCircleRepo.updateCurrentBalance("walletID", anything())).thenResolve();
      const walletBalanceResponse = await circleService.creditWalletBalance("workflowID", "walletID", 100);
      expect(walletBalanceResponse).toEqual(circleResponse);

      verify(mockCircleRepo.updateCurrentBalance("walletID", anything())).never();
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

      verify(mockCircleRepo.updateCurrentBalance(anyString(), anything())).never();
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
        transferID: "transferID",
        amount: 100,
        sourceWalletID: "sourceWalletID",
        destinationWalletID: "destinationWalletID",
        status: CircleTransferStatus.SUCCESS,
        createdAt: "dateNow",
      });

      when(mockCircleClient.getWalletBalance("destinationWalletID")).thenResolve(200);

      when(mockCircleRepo.updateCurrentBalance(anyString(), anything())).thenResolve();
      const transferResponse = await circleService.transferFunds(
        "idempotency-key",
        "sourceWalletID",
        "destinationWalletID",
        100,
      );
      expect(transferResponse).toEqual({
        id: "transferID",
        status: CircleTransferStatus.SUCCESS,
        createdAt: "dateNow",
      });

      verify(mockCircleRepo.updateCurrentBalance("sourceWalletID", 100)).once();
      verify(mockCircleRepo.updateCurrentBalance("destinationWalletID", 200)).once();
    });

    it("should not update cached balance when transfer fails", async () => {
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
        transferID: "transferID",
        amount: 100,
        sourceWalletID: "sourceWalletID",
        destinationWalletID: "destinationWalletID",
        status: CircleTransferStatus.TRANSFER_FAILED,
        createdAt: "dateNow",
      });

      when(mockCircleClient.getWalletBalance("destinationWalletID")).thenResolve(200);

      when(mockCircleRepo.updateCurrentBalance(anyString(), 100)).thenResolve();
      const transferResponse = await circleService.transferFunds(
        "idempotency-key",
        "sourceWalletID",
        "destinationWalletID",
        100,
      );
      expect(transferResponse).toEqual({
        id: "transferID",
        status: CircleTransferStatus.TRANSFER_FAILED,
        createdAt: "dateNow",
      });

      verify(mockCircleRepo.updateCurrentBalance("sourceWalletID", 100)).never();
      verify(mockCircleRepo.updateCurrentBalance("destinationWalletID", 200)).never();
    });
  });

  describe("getBalance", () => {
    it("should get balance", async () => {
      when(mockCircleClient.getWalletBalance("walletID")).thenResolve(200);
      const balance = await circleService.getBalance("walletID");
      expect(balance).toEqual({ balance: 200, currency: "USD" });
    });

    it("should get cached balance", async () => {
      when(mockCircleRepo.getCircleBalance("cached-walletID")).thenResolve(200);
      const balance = await circleService.getBalance("cached-walletID", true);
      expect(balance).toEqual({ balance: 200, currency: "USD" });
      verify(mockCircleClient.getWalletBalance("cached-walletID")).never();
    });

    it("should call circle client to get balance if cached is true and it doesn't exist in repo", async () => {
      when(mockCircleRepo.getCircleBalance("cached-walletID")).thenResolve(null);
      when(mockCircleClient.getWalletBalance("cached-walletID")).thenResolve(200);
      const balance = await circleService.getBalance("cached-walletID", true);
      expect(balance).toEqual({ balance: 200, currency: "USD" });
      verify(mockCircleRepo.getCircleBalance("cached-walletID")).once();
      verify(mockCircleClient.getWalletBalance("cached-walletID")).once();
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

  describe("getTransferStatus", () => {
    it("should return FAILED if the original transaction 'never' went through and proxy txn succeeds", async () => {
      when(mockCircleClient.getMasterWalletID()).thenReturn("MASTER_WALLET_ID");
      when(mockCircleClient.transfer(anything())).thenResolve({
        transferID: "TRANSFER_ID",
        status: CircleTransferStatus.SUCCESS,
        createdAt: Date.now().toLocaleString(),
        amount: 1,
        destinationWalletID: "MASTER_WALLET_ID",
        sourceWalletID: "MASTER_WALLET_ID",
      });

      const response: CircleTransferStatus = await circleService.getTransferStatus(
        "IDEMPOTENCY_KEY",
        "SOURCE_WALLET_ID",
        "DESTINATION_WALLET_ID",
        11,
      );

      expect(response).toBe(CircleTransferStatus.TRANSFER_FAILED);
      const [propagatedCircleTransferRequest] = capture(mockCircleClient.transfer).last();
      expect(propagatedCircleTransferRequest).toStrictEqual({
        idempotencyKey: "IDEMPOTENCY_KEY",
        sourceWalletID: "MASTER_WALLET_ID",
        destinationWalletID: "MASTER_WALLET_ID",
        amount: 1,
      });
    });

    it("should return FAILED if the original transaction went through but was failed", async () => {
      when(mockCircleClient.getMasterWalletID()).thenReturn("MASTER_WALLET_ID");
      when(mockCircleClient.transfer(anything())).thenResolve({
        transferID: "TRANSFER_ID",
        status: CircleTransferStatus.TRANSFER_FAILED,
        createdAt: Date.now().toLocaleString(),
        amount: 11,
        destinationWalletID: "DESTINATION_WALLET_ID",
        sourceWalletID: "SOURCE_WALLET_ID",
      });

      const response: CircleTransferStatus = await circleService.getTransferStatus(
        "IDEMPOTENCY_KEY",
        "SOURCE_WALLET_ID",
        "DESTINATION_WALLET_ID",
        11,
      );

      expect(response).toBe(CircleTransferStatus.TRANSFER_FAILED);
      const [propagatedCircleTransferRequest] = capture(mockCircleClient.transfer).last();
      expect(propagatedCircleTransferRequest).toStrictEqual({
        idempotencyKey: "IDEMPOTENCY_KEY",
        sourceWalletID: "MASTER_WALLET_ID",
        destinationWalletID: "MASTER_WALLET_ID",
        amount: 1,
      });
    });

    it("should return SUCCESS if the original transaction went through and was successful", async () => {
      when(mockCircleClient.getMasterWalletID()).thenReturn("MASTER_WALLET_ID");
      when(mockCircleClient.transfer(anything())).thenResolve({
        transferID: "TRANSFER_ID",
        status: CircleTransferStatus.SUCCESS,
        createdAt: Date.now().toLocaleString(),
        amount: 11,
        destinationWalletID: "DESTINATION_WALLET_ID",
        sourceWalletID: "SOURCE_WALLET_ID",
      });

      const response: CircleTransferStatus = await circleService.getTransferStatus(
        "IDEMPOTENCY_KEY",
        "SOURCE_WALLET_ID",
        "DESTINATION_WALLET_ID",
        11,
      );

      expect(response).toBe(CircleTransferStatus.SUCCESS);
      const [propagatedCircleTransferRequest] = capture(mockCircleClient.transfer).last();
      expect(propagatedCircleTransferRequest).toStrictEqual({
        idempotencyKey: "IDEMPOTENCY_KEY",
        sourceWalletID: "MASTER_WALLET_ID",
        destinationWalletID: "MASTER_WALLET_ID",
        amount: 1,
      });
    });

    it.each(["sourceWalletID", "destinationWalletID"])(
      "should return FAILED and raise an Alert if the executed transaction '%s' doesn't match with the input details",
      async field => {
        when(mockCircleClient.getMasterWalletID()).thenReturn("MASTER_WALLET_ID");
        when(mockAlertService.raiseAlert(anything())).thenResolve();

        const circleResponse: TransferResponse = {
          transferID: "TRANSFER_ID",
          status: CircleTransferStatus.SUCCESS,
          createdAt: Date.now().toLocaleString(),
          amount: 11,
          destinationWalletID: "DESTINATION_WALLET_ID",
          sourceWalletID: "SOURCE_WALLET_ID",
        };
        circleResponse[field] = "INVALID_ONE";
        when(mockCircleClient.transfer(anything())).thenResolve(circleResponse);

        const response: CircleTransferStatus = await circleService.getTransferStatus(
          "IDEMPOTENCY_KEY",
          "SOURCE_WALLET_ID",
          "DESTINATION_WALLET_ID",
          11,
        );

        expect(response).toBe(CircleTransferStatus.TRANSFER_FAILED);
        const [propagatedCircleTransferRequest] = capture(mockCircleClient.transfer).last();
        const [propagatedAlertPayload] = capture(mockAlertService.raiseAlert).last();
        expect(propagatedCircleTransferRequest).toStrictEqual({
          idempotencyKey: "IDEMPOTENCY_KEY",
          sourceWalletID: "MASTER_WALLET_ID",
          destinationWalletID: "MASTER_WALLET_ID",
          amount: 1,
        });
        expect(propagatedAlertPayload.key).toBe(AlertKey.UNEXPECTED_TRANSFER_CHECK);
      },
    );
  });
});
