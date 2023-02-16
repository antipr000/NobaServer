import { anything, instance, when } from "ts-mockito";

const mockHealthServiceCheck = jest.fn(async request => {
  return { status: 2 };
});
class MockTemporalHealthService {
  check = mockHealthServiceCheck;
}

const mockTemporalConn = jest.fn(async options => {
  return mockTemporalConnection;
});

const mockTemporalConnection = class MockTemporalConnection {
  public static healthService = new MockTemporalHealthService();
  static connect = mockTemporalConn;
};

const mockTemporalClient = class MockTemporalWorkflowClient {
  start = jest.fn(async (workflowName, options) => {
    return { workflowId: "123" };
  });
};

class MockTLSConfig {}

jest.mock("@temporalio/client", () => {
  return {
    Connection: mockTemporalConnection,
    WorkflowClient: mockTemporalClient,
    HealthService: mockHealthServiceCheck,
    TLSConfig: MockTLSConfig,
  };
});

import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { WorkflowExecutor } from "../workflow.executor";

import { HealthCheckStatus } from "../../../core/domain/HealthCheckTypes";
import { Utils } from "../../../core/utils/Utils";
import { ServiceException } from "../../../core/exception/service.exception";

describe("WorkflowExecutor", () => {
  //let app;
  let workflowExecutor: WorkflowExecutor;
  //const mockTemporal = temporalio as jest.Mocked<typeof temporalio>;

  jest.setTimeout(30000);

  beforeEach(async () => {
    //testEnv = await TestWorkflowEnvironment.create();

    // Don't wait the full sleep time
    jest.spyOn(Utils, "sleep").mockImplementation(anyNumber => Promise.resolve());

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          nobaWorkflow: {
            taskQueue: "NOBA_TASK_QUEUE",
            awsSecretNameForTaskQueue: "",
            clientUrl: "localhost:7233",
            awsSecretNameForClientUrl: "",
            temporalCloudCertificate: "Test-certificate",
            awsSecretForTemporalCloudCertificate: "",
            temporalCloudPrivateKey: "Test-private-key",
            awsSecretForTemporalCloudPrivateKey: "",
            connectionTimeoutInMs: 2000,
            namespace: "default",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [WorkflowExecutor],
    }).compile();

    workflowExecutor = app.get<WorkflowExecutor>(WorkflowExecutor);
  });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    // await testEnv?.teardown();
    //app.close();
  });

  describe("getHealth", () => {
    it("Should perform a successful health check", async () => {
      mockHealthServiceCheck.mockResolvedValue({ status: 1 });

      const health = await workflowExecutor.getHealth();
      expect(health).toEqual({ status: HealthCheckStatus.OK });
    });

    it("Should fail a health check", async () => {
      mockHealthServiceCheck.mockResolvedValue({ status: 2 });

      const health = await workflowExecutor.getHealth();
      expect(health).toEqual({ status: HealthCheckStatus.UNAVAILABLE });
    });
  });

  describe("init", () => {
    it("Should perform a successful initialization", async () => {
      const success = await workflowExecutor.init("Test");
      expect(success).toBe(true);
      expect(mockTemporalConn).toHaveBeenCalledTimes(1);
    });

    it("Should skip init if already initialized", async () => {
      const success = await workflowExecutor.init("Test");
      expect(success).toBe(true);

      const success2 = await workflowExecutor.init("Test");
      expect(success2).toBe(true);

      // Still only called once
      expect(mockTemporalConn).toHaveBeenCalledTimes(1);
    });

    it("Should retry failed connection attempt 1 time", async () => {
      mockTemporalConn.mockRejectedValueOnce(new Error("Unable to connect"));
      const success = await workflowExecutor.init("Test");
      expect(success).toBe(true);
      expect(mockTemporalConn).toHaveBeenCalledTimes(2);
    });

    it("Should try to connect 5 times before giving up", async () => {
      // 5 rejections (1st is the initial call, 4 retries))
      mockTemporalConn.mockRejectedValueOnce(new Error("Unable to connect 1"));
      mockTemporalConn.mockRejectedValueOnce(new Error("Unable to connect 2"));
      mockTemporalConn.mockRejectedValueOnce(new Error("Unable to connect 3"));
      mockTemporalConn.mockRejectedValueOnce(new Error("Unable to connect 4"));
      mockTemporalConn.mockRejectedValueOnce(new Error("Unable to connect 5"));

      const success = await workflowExecutor.init("Test");
      expect(success).toBe(false);
      expect(mockTemporalConn).toHaveBeenCalledTimes(5);
    });
  });

  describe("Workflow Tests", () => {
    describe("executeWalletWithdrawalWorkflow()", () => {
      it("Should return the workflow id", async () => {
        const workflowID = await workflowExecutor.executeWalletWithdrawalWorkflow("1234", "12345");
        expect(workflowID).toBe("123");
      });

      it("Should fail connection once then return the workflow id", async () => {
        const failedConns = 1;
        mockFailedConnections(failedConns);

        const workflowID = await workflowExecutor.executeWalletWithdrawalWorkflow("1234", "12345");
        expect(workflowID).toBe("123");
        expect(mockTemporalConn).toHaveBeenCalledTimes(failedConns + 1);
      });

      it("Should fail connection 6 times then work on the 7th and return the workflow id", async () => {
        const failedConns = 6;
        mockFailedConnections(failedConns);

        const workflowID = await workflowExecutor.executeWalletWithdrawalWorkflow("1234", "12345");
        expect(workflowID).toBe("123");
        expect(mockTemporalConn).toHaveBeenCalledTimes(failedConns + 1);
      });

      it("Should fail connection 10 times and throw an exception", async () => {
        const failedConns = 10;
        mockFailedConnections(failedConns);

        try {
          await workflowExecutor.executeWalletWithdrawalWorkflow("1234", "12345");
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(ServiceException);
        }
        expect(mockTemporalConn).toHaveBeenCalledTimes(failedConns);
      });
    });
  });

  describe("executeWalletDepositWorkflow()", () => {
    it("Should return the workflow id", async () => {
      const workflowID = await workflowExecutor.executeWalletDepositWorkflow("1234", "12345");
      expect(workflowID).toBe("123");
    });

    it("Should fail connection once then return the workflow id", async () => {
      const failedConns = 1;
      mockFailedConnections(failedConns);

      const workflowID = await workflowExecutor.executeWalletDepositWorkflow("1234", "12345");
      expect(workflowID).toBe("123");
      expect(mockTemporalConn).toHaveBeenCalledTimes(failedConns + 1);
    });

    it("Should fail connection 6 times then work on the 7th and return the workflow id", async () => {
      const failedConns = 6;
      mockFailedConnections(failedConns);

      const workflowID = await workflowExecutor.executeWalletDepositWorkflow("1234", "12345");
      expect(workflowID).toBe("123");
      expect(mockTemporalConn).toHaveBeenCalledTimes(failedConns + 1);
    });

    it("Should fail connection 10 times and throw an exception", async () => {
      const failedConns = 10;
      mockFailedConnections(failedConns);

      try {
        await workflowExecutor.executeWalletDepositWorkflow("1234", "12345");
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ServiceException);
      }
      expect(mockTemporalConn).toHaveBeenCalledTimes(failedConns);
    });
  });

  describe("executeWalletTransferWorkflow()", () => {
    it("Should return the workflow id", async () => {
      const workflowID = await workflowExecutor.executeWalletTransferWorkflow("1234", "12345");
      expect(workflowID).toBe("123");
    });

    it("Should fail connection once then return the workflow id", async () => {
      const failedConns = 1;
      mockFailedConnections(failedConns);

      const workflowID = await workflowExecutor.executeWalletTransferWorkflow("1234", "12345");
      expect(workflowID).toBe("123");
      expect(mockTemporalConn).toHaveBeenCalledTimes(failedConns + 1);
    });

    it("Should fail connection 6 times then work on the 7th and return the workflow id", async () => {
      const failedConns = 6;
      mockFailedConnections(failedConns);

      const workflowID = await workflowExecutor.executeWalletTransferWorkflow("1234", "12345");
      expect(workflowID).toBe("123");
      expect(mockTemporalConn).toHaveBeenCalledTimes(failedConns + 1);
    });

    it("Should fail connection 10 times and throw an exception", async () => {
      const failedConns = 10;
      mockFailedConnections(failedConns);

      try {
        await workflowExecutor.executeWalletTransferWorkflow("1234", "12345");
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ServiceException);
      }
      expect(mockTemporalConn).toHaveBeenCalledTimes(failedConns);
    });
  });
});

const mockFailedConnections = (num: number) => {
  for (let i = 1; i <= num; i++) {
    mockTemporalConn.mockRejectedValueOnce(new Error(`Unable to connect ${i}`));
  }
};
