class MockTemporalWorkflowClient {}

class MockTemporalHealthService {
  async check(request?) {
    return { status: 1 };
  }
}

class MockTemporalConnection {
  public static healthService = new MockTemporalHealthService();
  static async connect(options?): Promise<MockTemporalConnection> {
    return this;
  }
}

jest.mock("@temporalio/client", () => {
  return {
    Connection: MockTemporalConnection,
    WorkflowClient: MockTemporalWorkflowClient,
    HealthService: MockTemporalHealthService,
  };
});

import { Test, TestingModule } from "@nestjs/testing";
//import { TestWorkflowEnvironment } from "@temporalio/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { WorkflowExecutor } from "../workflow.executor";
import { when } from "ts-mockito";
import { HealthCheckStatus } from "../../../core/domain/HealthCheckTypes";
import * as mockTemporal from "@temporalio/client";

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

  it("Should perform a health check", async () => {
    // How to override mocks here for returning different health values?

    const health = await workflowExecutor.getHealth();
    expect(health).toEqual({ status: HealthCheckStatus.OK });
  });
});
