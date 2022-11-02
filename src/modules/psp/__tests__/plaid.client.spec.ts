class MockPlaidConfiguration {
  public static intializers: Array<any> = [];

  static reset() {
    MockPlaidConfiguration.intializers = [];
  }

  constructor(options) {
    MockPlaidConfiguration.intializers.push(options);
  }
}

class MockPlaidApi {
  public static intializers: Array<any> = [];
  public static linkTokenCreateParams = {
    shouldThrowError: false,
    incomingRequest: {},
    outputResponse: {
      status: 200,
      data: {
        link_token: "link-token",
      },
    },
  };

  static reset() {
    MockPlaidApi.intializers = [];
    MockPlaidApi.linkTokenCreateParams = {
      shouldThrowError: false,
      incomingRequest: {},
      outputResponse: {
        status: 200,
        data: {
          link_token: "link-token",
        },
      },
    };
  }

  constructor(options) {
    MockPlaidApi.intializers.push(options);
  }

  async linkTokenCreate(request) {
    if (MockPlaidApi.linkTokenCreateParams.shouldThrowError) {
      throw new BadRequestException("Invalid request.");
    }

    MockPlaidApi.linkTokenCreateParams.incomingRequest = request;
    return MockPlaidApi.linkTokenCreateParams.outputResponse;
  }
}

jest.mock("plaid", () => {
  return {
    Configuration: MockPlaidConfiguration,
    PlaidApi: MockPlaidApi,
    Products: {
      Auth: "auth",
    },
    CountryCode: {
      Us: "us",
    },
    DepositoryAccountSubtype: {
      Checking: "checking",
    },
    PlaidEnvironments: {
      sandbox: "sandbox",
    },
  };
});

import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  PLAID_CLIENT_ID,
  PLAID_CONFIG_KEY,
  PLAID_ENVIRONMENT,
  PLAID_REDIRECT_URI,
  PLAID_SECRET_KEY,
  PLAID_VERSION,
} from "../../../config/ConfigurationUtils";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { PlaidClient } from "../plaid.client";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

describe("PlaidClientTests", () => {
  let plaidClient: PlaidClient;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          [PLAID_CONFIG_KEY]: {
            [PLAID_ENVIRONMENT]: "sandbox",
            [PLAID_VERSION]: "2020-09-14",
            [PLAID_CLIENT_ID]: "dummy-plaid-client-id",
            [PLAID_SECRET_KEY]: "dummy-plaid-secret-key",
            [PLAID_REDIRECT_URI]: "https://tests.noba.com",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [PlaidClient],
    }).compile();

    plaidClient = app.get<PlaidClient>(PlaidClient);
  });

  afterEach(() => {});

  describe("generateLinkToken()", () => {
    it("should return linkToken if Plaid returns success", async () => {
      const userID = "fake-noba-consumer-id";

      const receivedLinkToken: string = await plaidClient.generateLinkToken({
        userID: userID,
      });

      const expectedCreateLinkRequest = {
        user: {
          client_user_id: userID,
        },
        client_name: "Noba",
        products: ["auth"],
        country_codes: ["us"],
        language: "en",
        account_filters: {
          depository: {
            account_subtypes: ["checking"],
          },
        },
        redirect_uri: "https://tests.noba.com",
      };
      expect(receivedLinkToken).toBe(MockPlaidApi.linkTokenCreateParams.outputResponse.data.link_token);
      expect(MockPlaidApi.linkTokenCreateParams.incomingRequest).toStrictEqual(expectedCreateLinkRequest);
    });

    it("should throw error if Plaid returns error", async () => {
      const userID = "fake-noba-consumer-id";
      MockPlaidApi.linkTokenCreateParams.shouldThrowError = true;

      try {
        await plaidClient.generateLinkToken({
          userID: userID,
        });
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(InternalServerErrorException);

        const expectedCreateLinkRequest = {
          user: {
            client_user_id: userID,
          },
          client_name: "Noba",
          products: ["auth"],
          country_codes: ["us"],
          language: "en",
          account_filters: {
            depository: {
              account_subtypes: ["checking"],
            },
          },
          redirect_uri: "https://tests.noba.com",
        };
        expect(MockPlaidApi.linkTokenCreateParams.incomingRequest).toStrictEqual(expectedCreateLinkRequest);
      }
    });
  });
});
