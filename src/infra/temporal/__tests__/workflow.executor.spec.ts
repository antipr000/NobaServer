import { anything, instance, when } from "ts-mockito";

class MockTemporalWorkflowClient {}

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

class MockTLSConfig {}

jest.mock("@temporalio/client", () => {
  return {
    Connection: mockTemporalConnection,
    WorkflowClient: MockTemporalWorkflowClient,
    HealthService: mockHealthServiceCheck,
    TLSConfig: MockTLSConfig,
  };
});

import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { WorkflowExecutor } from "../workflow.executor";

import { HealthCheckStatus } from "../../../core/domain/HealthCheckTypes";

describe("WorkflowExecutor", () => {
  //let app;
  let workflowExecutor: WorkflowExecutor;
  //const mockTemporal = temporalio as jest.Mocked<typeof temporalio>;

  jest.setTimeout(30000);

  beforeAll(async () => {
    //testEnv = await TestWorkflowEnvironment.create();

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          nobaWorkflow: {
            taskQueue: "NOBA_TASK_QUEUE",
            awsSecretNameForTaskQueue: "",
            clientUrl: "localhost:7233",
            awsSecretNameForClientUrl: "",
            awsSecretForTemporalCloudCertificate: "",
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
      //healthServiceCheck.mockResolvedValue({ status: 1 });
      //when(mockTemporalConn).thenThrow(new Error("This is an error"));
      //const health = await workflowExecutor.getHealth();
      //expect(health).toEqual({ status: HealthCheckStatus.OK });
    });
  });
});
