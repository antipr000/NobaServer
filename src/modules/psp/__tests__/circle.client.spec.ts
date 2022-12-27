class MockCircleConfiguration {
  public static intializers: Array<any> = [];

  static reset() {
    MockCircleConfiguration.intializers = [];
  }

  constructor(options) {
    MockCircleConfiguration.intializers.push(options);
  }
}

class MockCircleApi {
  public static intializers: Array<any> = [];

  static reset() {
    MockCircleApi.intializers = [];
  }

  constructor(options) {
    MockCircleApi.intializers.push(options);
  }
}

jest.mock("circle", () => {
  return {
    Configuration: MockCircleConfiguration,
    CircleApi: MockCircleApi,
  };
});

import { Test, TestingModule } from "@nestjs/testing";
import {
  CIRCLE_API_KEY,
  CIRCLE_CONFIG_KEY,
  CIRCLE_ENVIRONMENT,
  CIRCLE_MASTER_WALLET_ID,
} from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { CircleClient } from "../circle.client";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

describe("CircleClientTests", () => {
  let circleClient: CircleClient;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          [CIRCLE_CONFIG_KEY]: {
            [CIRCLE_ENVIRONMENT]: "sandbox",
            [CIRCLE_API_KEY]: "dummy-circle-api-key",
            [CIRCLE_MASTER_WALLET_ID]: "dummy-circle-master-wallet-id",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [CircleClient],
    }).compile();

    circleClient = app.get<CircleClient>(CircleClient);
  });

  afterEach(() => {});

  describe("getMasterWalletID()", () => {
    it("should return masterWalletID if Circle returns success", async () => {
      const receivedMasterWalletID: string = await circleClient.getMasterWalletID();
      expect(receivedMasterWalletID).toBe(CIRCLE_MASTER_WALLET_ID);
    });
  });
});
