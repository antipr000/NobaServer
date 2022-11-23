import { InternalServerErrorException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
// import mockAxios from "jest-mock-axios";
import axios, { AxiosRequestConfig } from "axios";
import { instance, when } from "ts-mockito";
import {
  ZEROHASH_API_KEY,
  ZEROHASH_API_SECRET,
  ZEROHASH_CONFIG_KEY,
  ZEROHASH_HOST,
  ZEROHASH_PASS_PHRASE,
  ZEROHASH_PLATFORM_CODE,
} from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { LocationService } from "../../../modules/common/location.service";
import { getMockLocationServiceWithDefaults } from "../../../modules/common/mocks/mock.location.service";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { VerificationProviders } from "../../../modules/consumer/domain/VerificationData";
import { DocumentVerificationStatus, KYCStatus, RiskLevel } from "../../../modules/consumer/domain/VerificationStatus";
import { ConsumerService } from "../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../consumer/mocks/mock.consumer.service";
import { TradeState, ZerohashTradeRequest, ZerohashTradeResponse } from "../domain/ZerohashTypes";
import { ZeroHashService } from "../zerohash.service";
const zerohashConfigs = {
  [ZEROHASH_CONFIG_KEY]: {
    [ZEROHASH_API_KEY]: "test-api-key",
    [ZEROHASH_API_SECRET]: "test-api-secret",
    [ZEROHASH_PASS_PHRASE]: "test-pass-phrase",
    [ZEROHASH_HOST]: "http://localhost:8080/zerohash",
    [ZEROHASH_PLATFORM_CODE]: "test-platform-code",
  },
};

function getAxiosConfig(method, route, body?) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto_ts = require("crypto");

  const timestamp = Math.round(Date.now() / 1000);
  const payload = timestamp + method + route + JSON.stringify(body ? body : {}); // The empty {} is important when there is no body
  const decodedSecret = Buffer.from("test-api-secret", "base64");
  const hmac = crypto_ts.createHmac("sha256", decodedSecret);
  // Don't forget to base 64 encode your digest
  const signedPayload = hmac.update(payload).digest("base64");

  const axiosConfig: AxiosRequestConfig = {
    baseURL: "https://http://localhost:8080/zerohash",
    headers: {
      "X-SCX-API-KEY": "test-api-key",
      "X-SCX-SIGNED": signedPayload,
      "X-SCX-TIMESTAMP": timestamp,
      "X-SCX-PASSPHRASE": "test-pass-phrase",
    },
    method: method,
    httpsAgent: null,
    data: body,
    url: route,
  };
  return axiosConfig;
}

function getMockTradeData(tradeID: string, trade_status: string, settlement_status?) {
  return {
    status: 200,
    data: {
      message: {
        client_trade_id: "f2f14251-e296-42ac-9bc7-01c9186b9219",
        trade_reporter: "user@00SCXM.com",
        reporting_party: "SCXM",
        settlement_schedule: "ABCDEF",
        platform_code: "00TEST",
        market_identifier_code: "SCXM",
        symbol: "BTC/USD",
        product_type: "spot",
        trade_type: "regular",
        trade_price: "10000",
        trade_quantity: "1.0",
        trade_state: trade_status,
        physical_delivery: true,
        transaction_timestamp: 2554408627334,
        comment: "Some comments about the trade for Zero Hash to store",
        parties_anonymous: true,
        settlement_price_index_id: null,
        settled_timestamp: 2554408627334,
        expiry_timestamp: 2554408627334,
        bank_fee: "1.00",
        parties: [
          {
            side: "sell",
            participant_code: "ABCDEF",
            asset: "BTC",
            amount: "0.00001",
            liquidity_indicator: null,
            client_order_id: null,
            order_id: "foo",
            execution_id: "ex_id1",
            settling: false,
            account_label: "test_label",
            collateral_percentage: "0.1",
            account_group: "ABCDEF",
            settlement_state: settlement_status,
          },
          {
            side: "buy",
            participant_code: "ABCDEF",
            asset: "BTC",
            amount: "0.00001",
            liquidity_indicator: null,
            client_order_id: null,
            order_id: "foo",
            execution_id: "ex_id1",
            settling: false,
            account_label: "test_label",
            collateral_percentage: "0.1",
            account_group: "ABCDEF",
          },
        ],
        trade_id: tradeID,
        network_fee_notional: "1",
        network_fee_quantity: "1",
        total_notional: "2.00",
        asset_cost_notional: "2.00",
      },
    },
  };
}

function getAccountsResponse(consumer: Consumer) {
  return {
    status: 200,
    data: {
      message: {
        first_name: consumer.props.firstName,
        last_name: consumer.props.lastName,
        email: consumer.props.email,
        address_one: consumer.props.address.streetLine1,
        address_two: consumer.props.address.streetLine2,
        city: consumer.props.address.city,
        state: consumer.props.address.regionCode,
        zip: consumer.props.address.postalCode,
        date_of_birth: consumer.props.dateOfBirth,
        id_number_type: "ssn",
        id_number: consumer.props.socialSecurityNumber,
        non_us_other_type: null,
        id_issuing_authority: null,
        signed_timestamp: 1603378501286,
        risk_rating: null,
        metadata: {},
        platform_code: "ABC123",
        participant_code: "XYZ456",
      },
    },
  };
}

describe("Zerohash Service", () => {
  let consumerService: ConsumerService;
  let zerohashService: ZeroHashService;
  let locationService: LocationService;
  jest.setTimeout(20000);
  beforeEach(async () => {
    consumerService = getMockConsumerServiceWithDefaults();
    locationService = getMockLocationServiceWithDefaults();
    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync(zerohashConfigs), getTestWinstonModule()],
      providers: [
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: LocationService,
          useFactory: () => instance(locationService),
        },
        ZeroHashService,
      ],
    }).compile();
    zerohashService = app.get<ZeroHashService>(ZeroHashService);
  });

  describe("createParticipant()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("should create a participant", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: "test@noba.com",
        firstName: "John",
        lastName: "Doe",
        address: {
          streetLine1: "addr-line1",
          streetLine2: "addr-line2",
          city: "Anytown",
          countryCode: "US",
          postalCode: "12345",
          regionCode: "NY",
        },
        dateOfBirth: "1998-01-01",
        socialSecurityNumber: "111223333",
        verificationData: {
          kycVerificationTimestamp: new Date().getTime(),
          verificationProvider: VerificationProviders.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationStatus: KYCStatus.APPROVED,
        },
        riskRating: "0",
        partners: [
          {
            partnerID: "partner-1234",
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });
      when(consumerService.getDecryptedSSN(consumer.props)).thenResolve(consumer.props.socialSecurityNumber);
      when(locationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn({
        countryName: undefined,
        countryISOCode: consumer.props.address.countryCode,
        alternateCountryName: "US",
      });

      const transactionTimestamp = new Date();
      const consumerData = {
        first_name: consumer.props.firstName,
        last_name: consumer.props.lastName,
        email: consumer.props.email,
        address_one: consumer.props.address.streetLine1,
        address_two: consumer.props.address.streetLine2,
        city: consumer.props.address.city,
        state: consumer.props.address.regionCode,
        zip: consumer.props.address.postalCode,

        country: "US", // ZH has its own spellings for some of the countries, so we store that in alternateCountryName
        date_of_birth: consumer.props.dateOfBirth, // ZH format and our format are both YYYY-MM-DD
        id_number_type: "ssn", // TODO: Support other types outside US
        id_number: consumer.props.socialSecurityNumber, // TODO: Support other types outside US
        signed_timestamp: transactionTimestamp.getTime(),
        metadata: {
          cip_kyc: "Pass", // We do not allow failed KYC to get here, so this is always pass
          cip_timestamp: consumer.props.verificationData.kycVerificationTimestamp,
          sanction_screening: "Pass", // We do not allow failed sanctions screening to get here, so this is always pass
          sanction_screening_timestamp: consumer.props.verificationData.kycVerificationTimestamp,
        },
        risk_rating: consumer.props.riskRating,
      };
      const axiosConfig = getAxiosConfig("POST", "/participants/customers/new", consumerData);
      const expectedResponse = getAccountsResponse(consumer);

      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Summary (for future reference) - The reason is that "jest-mock-axios" doesn't handle more than 1 awaits in the mocked function.
      // The reason for that is, the library assumes that the flow already is at axios.post(...) before we try to provide a mock (or verify the call) for it.
      // So, if there are 2 or more await in the target function, the library would be waiting on the first "await" and expect it to be a axios call.
      // Theoritically the test can be flaky as well because we are mocking all external dependencies, so flow can reach any of the await.
      // So, the interim solution for that would be to add a timeout for 100 ms or so to make sure that the flow actually reaches the await call.
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(expectedResponse);
      const responsePromise = zerohashService.createParticipant(consumer.props, transactionTimestamp);

      const response = await responsePromise;
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      console.log(`Response: ${response}`);
      expect(response).toBe(expectedResponse.data);
    });

    it("should not create participant if KYC not approved", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: "test@noba.com",
        firstName: "John",
        lastName: "Doe",
        address: {
          streetLine1: "addr-line1",
          streetLine2: "addr-line2",
          city: "Anytown",
          countryCode: "US",
          postalCode: "12345",
          regionCode: "NY",
        },
        dateOfBirth: "1998-01-01",
        socialSecurityNumber: "111223333",
        verificationData: {
          kycVerificationTimestamp: new Date().getTime(),
          verificationProvider: VerificationProviders.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationStatus: KYCStatus.NOT_SUBMITTED,
        },
        riskRating: "0",
        partners: [
          {
            partnerID: "partner-1234",
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });
      when(consumerService.getDecryptedSSN(consumer.props)).thenResolve(consumer.props.socialSecurityNumber);
      when(locationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn({
        countryName: undefined,
        countryISOCode: consumer.props.address.countryCode,
        alternateCountryName: "US",
      });

      const transactionTimestamp = new Date();
      const expectedResponse = getAccountsResponse(consumer);

      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(expectedResponse);
      const responsePromise = zerohashService.createParticipant(consumer.props, transactionTimestamp);

      const response = await responsePromise;
      expect(getSpy).toHaveBeenCalledTimes(0);
      console.log(`Response: ${response}`);
      expect(response).toBe(null);
    });

    it("should not create participant if document status is Rejected", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: "test@noba.com",
        firstName: "John",
        lastName: "Doe",
        address: {
          streetLine1: "addr-line1",
          streetLine2: "addr-line2",
          city: "Anytown",
          countryCode: "US",
          postalCode: "12345",
          regionCode: "NY",
        },
        dateOfBirth: "1998-01-01",
        socialSecurityNumber: "111223333",
        verificationData: {
          kycVerificationTimestamp: new Date().getTime(),
          verificationProvider: VerificationProviders.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.REJECTED,
          kycVerificationStatus: KYCStatus.APPROVED,
        },
        riskRating: "0",
        partners: [
          {
            partnerID: "partner-1234",
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });
      when(consumerService.getDecryptedSSN(consumer.props)).thenResolve(consumer.props.socialSecurityNumber);
      when(locationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn({
        countryName: undefined,
        countryISOCode: consumer.props.address.countryCode,
        alternateCountryName: "US",
      });

      const transactionTimestamp = new Date();
      const expectedResponse = getAccountsResponse(consumer);

      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(expectedResponse);
      const responsePromise = zerohashService.createParticipant(consumer.props, transactionTimestamp);

      const response = await responsePromise;
      expect(getSpy).toHaveBeenCalledTimes(0);
      expect(response).toBe(null);
    });

    it("should not create participant if sanction level is High", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: "test@noba.com",
        firstName: "John",
        lastName: "Doe",
        address: {
          streetLine1: "addr-line1",
          streetLine2: "addr-line2",
          city: "Anytown",
          countryCode: "US",
          postalCode: "12345",
          regionCode: "NY",
        },
        dateOfBirth: "1998-01-01",
        socialSecurityNumber: "111223333",
        verificationData: {
          kycVerificationTimestamp: new Date().getTime(),
          verificationProvider: VerificationProviders.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationStatus: KYCStatus.APPROVED,
          sanctionLevel: RiskLevel.HIGH,
        },
        riskRating: "0",
        partners: [
          {
            partnerID: "partner-1234",
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });
      when(consumerService.getDecryptedSSN(consumer.props)).thenResolve(consumer.props.socialSecurityNumber);
      when(locationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn({
        countryName: undefined,
        countryISOCode: consumer.props.address.countryCode,
        alternateCountryName: "US",
      });

      const transactionTimestamp = new Date();
      const expectedResponse = getAccountsResponse(consumer);

      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(expectedResponse);
      const responsePromise = zerohashService.createParticipant(consumer.props, transactionTimestamp);

      const response = await responsePromise;
      expect(getSpy).toHaveBeenCalledTimes(0);
      expect(response).toBe(null);
    });
  });

  describe("checkTradeStatus()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("should return accepted trade status as PENDING", async () => {
      const tradeID = "9411a2d9-8964-47d0-8971-a52db2f65748";
      const mockTradeData = getMockTradeData(tradeID, "accepted");
      const axiosConfig = getAxiosConfig("GET", `/trades/${tradeID}`);

      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(mockTradeData);
      const response = await zerohashService.checkTradeStatus(tradeID);

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      console.log(`Response: ${response}`);

      const expectedResponse: ZerohashTradeResponse = {
        tradeID: tradeID,
        tradeState: TradeState.PENDING,
        settledTimestamp: null,
        errorMessage: null,
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("should return active trade status as PENDING", async () => {
      const tradeID = "9411a2d9-8964-47d0-8971-a52db2f65748";
      const mockTradeData = getMockTradeData(tradeID, "active");
      const axiosConfig = getAxiosConfig("GET", `/trades/${tradeID}`);

      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(mockTradeData);
      const response = await zerohashService.checkTradeStatus(tradeID);

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      console.log(`Response: ${response}`);

      const expectedResponse: ZerohashTradeResponse = {
        tradeID: tradeID,
        tradeState: TradeState.PENDING,
        settledTimestamp: null,
        errorMessage: null,
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("should return terminated trade status, with sell side as settled as SETTLED", async () => {
      const tradeID = "9411a2d9-8964-47d0-8971-a52db2f65748";
      const mockTradeData = getMockTradeData(tradeID, "terminated", "settled");
      const axiosConfig = getAxiosConfig("GET", `/trades/${tradeID}`);

      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(mockTradeData);
      const response = await zerohashService.checkTradeStatus(tradeID);

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      console.log(`Response: ${response}`);

      const expectedResponse: ZerohashTradeResponse = {
        tradeID: tradeID,
        tradeState: TradeState.SETTLED,
        settledTimestamp: 2554408627334,
        errorMessage: null,
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("should return terminated trade status, with sell side as NOT settled as DEFAULTED", async () => {
      const tradeID = "9411a2d9-8964-47d0-8971-a52db2f65748";
      const mockTradeData = getMockTradeData(tradeID, "terminated");
      const axiosConfig = getAxiosConfig("GET", `/trades/${tradeID}`);

      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(mockTradeData);
      const response = await zerohashService.checkTradeStatus(tradeID);

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      console.log(`Response: ${response}`);

      const expectedResponse: ZerohashTradeResponse = {
        tradeID: tradeID,
        tradeState: TradeState.DEFAULTED,
        settledTimestamp: null,
        errorMessage: "Trade could not be settled by the expiry time",
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("should return invalid trade status as PENDING", async () => {
      const tradeID = "9411a2d9-8964-47d0-8971-a52db2f65748";
      const mockTradeData = getMockTradeData(tradeID, "dgweyg_invalid");
      const axiosConfig = getAxiosConfig("GET", `/trades/${tradeID}`);

      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(mockTradeData);
      const response = await zerohashService.checkTradeStatus(tradeID);

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      console.log(`Response: ${response}`);

      const expectedResponse: ZerohashTradeResponse = {
        tradeID: tradeID,
        tradeState: TradeState.PENDING,
        settledTimestamp: null,
        errorMessage: null,
      };
      expect(response).toStrictEqual(expectedResponse);
    });
  });

  describe("transaferAssetsToNoba()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("transfer assets from ZHLS to noba account", async () => {
      const zhResponse = {
        status: 200,
        data: {
          message: {
            id: 78,
            created_at: "2020-09-01T20:53:31.653Z",
            updated_at: "2020-09-01T20:53:31.653Z",
            status: "settled",
            requested_amount: "23",
            settled_amount: "21",
            from_participant_code: "ABC123",
            from_account_group: "ABCDEF",
            from_account_label: "general",
            to_participant_code: "DEMO01",
            to_account_group: "ABCDEF",
            to_account_label: "general",
            asset: "BTC",
            amount: "100.00",
            movement_id: "1902a0eb-a925-4d08-bcad-ea8ed4696a24",
            client_transfer_id: "e6afed46-301e-46ee-a339-e897e9855c3a",
          },
        },
      };
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.transferAssetsToNoba("BTC", 100, "client_transfer_id");
      expect(getSpy).toHaveBeenCalledTimes(1);
      const expectedResponse = {
        transferID: 78,
        cryptoAmount: "100.00",
        cryptocurrency: "BTC",
      };
      expect(response).toStrictEqual(expectedResponse);
    });
  });

  describe("executeTrade()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("Execute a trade", async () => {
      const zhResponse = {
        status: 200,
        data: {
          message: {
            client_trade_id: "f2f14251-e296-42ac-9bc7-01c9186b9219",
            trade_reporter: "user@00SCXM.com",
            reporting_party: "SCXM",
            settlement_schedule: "ABCDEF",
            platform_code: "00TEST",
            market_identifier_code: "SCXM",
            symbol: "BTC/USD",
            product_type: "spot",
            trade_type: "regular",
            trade_price: "10000",
            trade_quantity: "1.0",
            trade_state: "accepted",
            physical_delivery: true,
            transaction_timestamp: 2554408627334,
            comment: "Some comments about the trade for Zero Hash to store",
            parties_anonymous: true,
            settlement_price_index_id: null,
            settlement_timestamp: 2554408627334,
            expiry_timestamp: 2554408627334,
            bank_fee: "1.00",
            parties: [
              {
                side: "buy",
                participant_code: "ABCDEF",
                asset: "BTC",
                amount: "0.00001",
                liquidity_indicator: null,
                client_order_id: null,
                order_id: "foo",
                execution_id: "ex_id1",
                settling: false,
                account_label: "test_label",
                collateral_percentage: "0.1",
                account_group: "ABCDEF",
              },
              {
                side: "buy",
                participant_code: "ABCDEF",
                asset: "BTC",
                amount: "0.00001",
                liquidity_indicator: null,
                client_order_id: null,
                order_id: "foo",
                execution_id: "ex_id1",
                settling: false,
                account_label: "test_label",
                collateral_percentage: "0.1",
                account_group: "ABCDEF",
              },
            ],
            trade_id: "9411a2d9-8964-47d0-8971-a52db2f65748",
            network_fee_notional: "1",
            network_fee_quantity: "1",
            total_notional: "2.00",
            asset_cost_notional: "2.00",
          },
        },
      };
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const request: ZerohashTradeRequest = {
        idempotencyID: "123",
        requestorEmail: "user@00SCXM.com",
        buyerParticipantCode: "ABCDEF",
        sellerParticipantCode: "ABCDEF",
        tradePrice: 10000,
        buyAmount: 0.00001,
        boughtAssetID: "BTC",
        sellAmount: 0,
        totalFiatAmount: 1,
        soldAssetID: "USD",
      };
      const response = await zerohashService.executeTrade(request);
      expect(getSpy).toHaveBeenCalledTimes(1);
      const expectedResponse = {
        tradeID: "9411a2d9-8964-47d0-8971-a52db2f65748",
      };
      expect(response).toStrictEqual(expectedResponse);
    });
  });

  describe("getParticipant()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("Get participant by email", async () => {
      const zhResponse = {
        status: 200,
        data: {
          message: {
            participant_code: "CUST01",
            email: "test@example.com",
          },
        },
      };
      const axiosConfig = getAxiosConfig("GET", "/participants/test@example.com");

      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getParticipant("test@example.com");
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      expect(response).toStrictEqual(zhResponse["data"]);
    });
  });

  describe("getParticipants()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("Get all participants", async () => {
      const zhResponse = {
        status: 200,
        data: {
          message: [
            {
              participant_code: "CUST01",
              participant_name: "robert test",
              credit_limit: null,
              email: "test@example.com",
              custodian_participant_code: "CUST01",
              status: "approved",
            },
          ],
          page: 1,
          total_pages: 1,
          page_size: 200,
          count: 10,
        },
      };
      const axiosConfig = getAxiosConfig("GET", "/participants");

      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getAllParticipants();
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      expect(response).toStrictEqual(zhResponse["data"]);
    });
  });

  describe("estimateNetworkFee()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("estimate network fee", async () => {
      const cryptoCurrency = "ETH";
      const fiatCurrency = "USD";
      const axiosConfig = getAxiosConfig(
        "GET",
        `/withdrawals/estimate_network_fee?underlying=${cryptoCurrency}&quoted_currency=${fiatCurrency}`,
        {},
      );
      const zhResponse = {
        status: 200,
        data: {
          message: {
            underlying: "ETH",
            quoted_currency: "USD",
            network_fee_asset: "ETH",
            network_fee_quantity: "10",
            total_notional: "20",
          },
        },
      };
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const responsePromise = zerohashService.estimateNetworkFee(cryptoCurrency, fiatCurrency);

      const response = await responsePromise;
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      console.log(`Response: ${response}`);
      const expectedResponse = {
        cryptoCurrency: "ETH",
        feeInCrypto: 10,
        fiatCurrency: "USD",
        feeInFiat: 20,
      };
      expect(response).toStrictEqual(expectedResponse);
    });
  });

  describe("getParticipant()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("return participant code as it is if zh code exists", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: "test@noba.com",
        firstName: "John",
        lastName: "Doe",
        address: {
          streetLine1: "addr-line1",
          streetLine2: "addr-line2",
          city: "Anytown",
          countryCode: "US",
          postalCode: "12345",
          regionCode: "NY",
        },
        dateOfBirth: "1998-01-01",
        socialSecurityNumber: "111223333",
        verificationData: {
          kycVerificationTimestamp: new Date().getTime(),
          verificationProvider: VerificationProviders.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationStatus: KYCStatus.APPROVED,
        },
        riskRating: "0",
        partners: [
          {
            partnerID: "partner-1234",
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
        zhParticipantCode: "123",
      });
      const response = await zerohashService.getParticipantCode(consumer.props, new Date());
      expect(response).toStrictEqual("123");
    });

    it("return participant code as it is if user is already registered with ZH", async () => {
      const zhResponse = {
        status: 200,
        data: {
          message: {
            participant_code: "CUST01",
            email: "test@noba.com",
          },
        },
      };
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: "test@noba.com",
        firstName: "John",
        lastName: "Doe",
        address: {
          streetLine1: "addr-line1",
          streetLine2: "addr-line2",
          city: "Anytown",
          countryCode: "US",
          postalCode: "12345",
          regionCode: "NY",
        },
        dateOfBirth: "1998-01-01",
        socialSecurityNumber: "111223333",
        verificationData: {
          kycVerificationTimestamp: new Date().getTime(),
          verificationProvider: VerificationProviders.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationStatus: KYCStatus.APPROVED,
        },
        riskRating: "0",
        partners: [
          {
            partnerID: "partner-1234",
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });
      const axiosConfig = getAxiosConfig("GET", "/participants/test@noba.com");
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getParticipantCode(consumer.props, new Date());
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      expect(response).toStrictEqual("CUST01");
    });
  });

  describe("getWithdrawal()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("pending withdrawal", async () => {
      const axiosConfig = getAxiosConfig("GET", "/withdrawals/requests/78");
      const zhResponse = getMockWithdrawalResponse("PENDING");
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getWithdrawal("78");

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      const expectedResponse = {
        gasPrice: null,
        requestedAmount: 23,
        settledAmount: 21,
        onChainTransactionID: null,
        onChainStatus: "pending",
        withdrawalStatus: "pending",
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("approved withdrawal", async () => {
      const axiosConfig = getAxiosConfig("GET", "/withdrawals/requests/78");
      const zhResponse = getMockWithdrawalResponse("APPROVED");
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getWithdrawal("78");

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      const expectedResponse = {
        gasPrice: null,
        requestedAmount: 23,
        settledAmount: 21,
        onChainTransactionID: null,
        onChainStatus: "pending",
        withdrawalStatus: "approved",
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("rejected withdrawal", async () => {
      const axiosConfig = getAxiosConfig("GET", "/withdrawals/requests/78");
      const zhResponse = getMockWithdrawalResponse("REJECTED");
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getWithdrawal("78");

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      const expectedResponse = {
        gasPrice: null,
        requestedAmount: 23,
        settledAmount: 21,
        onChainTransactionID: null,
        onChainStatus: "pending",
        withdrawalStatus: "rejected",
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("settled withdrawal", async () => {
      const axiosConfig = getAxiosConfig("GET", "/withdrawals/requests/78");
      const zhResponse = getMockWithdrawalResponse("SETTLED");
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getWithdrawal("78");

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      const expectedResponse = {
        gasPrice: null,
        requestedAmount: 23,
        settledAmount: 21,
        onChainTransactionID: null,
        onChainStatus: "pending",
        withdrawalStatus: "settled",
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("unexpected withdrawal status", async () => {
      const axiosConfig = getAxiosConfig("GET", "/withdrawals/requests/78");
      const zhResponse = getMockWithdrawalResponse("AAA");
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getWithdrawal("78");

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      const expectedResponse = {
        gasPrice: null,
        requestedAmount: 23,
        settledAmount: 21,
        onChainTransactionID: null,
        onChainStatus: "pending",
        withdrawalStatus: "rejected",
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("confirmed on chain status", async () => {
      const axiosConfig = getAxiosConfig("GET", "/withdrawals/requests/78");
      const zhResponse = getMockWithdrawalResponse("PENDING", "CONFIRMED");
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getWithdrawal("78");

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      const expectedResponse = {
        gasPrice: null,
        requestedAmount: 23,
        settledAmount: 21,
        onChainTransactionID: null,
        onChainStatus: "confirmed",
        withdrawalStatus: "pending",
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("null on chain status", async () => {
      const axiosConfig = getAxiosConfig("GET", "/withdrawals/requests/78");
      const zhResponse = getMockWithdrawalResponse("PENDING", null);
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getWithdrawal("78");

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      const expectedResponse = {
        gasPrice: null,
        requestedAmount: 23,
        settledAmount: 21,
        onChainTransactionID: null,
        onChainStatus: "pending",
        withdrawalStatus: "pending",
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("invalid on chain status", async () => {
      const axiosConfig = getAxiosConfig("GET", "/withdrawals/requests/78");
      const zhResponse = getMockWithdrawalResponse("PENDING", "AAA");
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getWithdrawal("78");

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      const expectedResponse = {
        gasPrice: null,
        requestedAmount: 23,
        settledAmount: 21,
        onChainTransactionID: null,
        onChainStatus: "error",
        withdrawalStatus: "pending",
      };
      expect(response).toStrictEqual(expectedResponse);
    });
  });

  describe("requestCryptoCurrencyForDesiredQuantity()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("success", async () => {
      const cryptoCurrency = "BTC";
      const cryptoQuantity = 1;
      const fiatCurrency = "USD";

      const axiosConfig = getAxiosConfig(
        "GET",
        `/liquidity/rfq?underlying=${cryptoCurrency}&quoted_currency=${fiatCurrency}&side=buy&quantity=${cryptoQuantity}`,
      );
      const zhResponse = {
        status: 200,
        data: {
          message: {
            request_id: "ce819fe8-b1d7-43bb-961c-e09ede0988d3",
            participant_code: "CUST01",
            quoted_currency: "USD",
            side: "BUY",
            quantity: "1",
            price: "11430.90",
            quote_id: "5cd07738b861c31e3bd61467BTC1Buy1568311644602",
            expire_ts: 1568311649602,
            account_group: "GRP001",
            account_label: "general",
            obo_participant: {
              participant_code: "20XRLH",
              account_group: "WRD1K0",
              account_label: "general",
            },
            network_fee_notional: "1",
            network_fee_quantity: "1",
            total_notional: "2.00",
            underlying: "BTC",
            asset_cost_notional: "2.00",
          },
        },
      };
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.requestQuoteForDesiredCryptoQuantity("BTC", "USD", 1);

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      const expectedResponse = {
        quoteID: "5cd07738b861c31e3bd61467BTC1Buy1568311644602",
        expireTimestamp: 1568311649602,
        cryptoCurrency: "BTC",
        fiatCurrency: "USD",
        perUnitCryptoAssetCost: "11430.90",
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("fail", async () => {
      const cryptoCurrency = "BTC";
      const cryptoQuantity = 1;
      const fiatCurrency = "USD";

      const axiosConfig = getAxiosConfig(
        "GET",
        `/liquidity/rfq?underlying=${cryptoCurrency}&quoted_currency=${fiatCurrency}&side=buy&quantity=${cryptoQuantity}`,
      );
      const zhResponse = {
        status: 200,
        data: {
          message: {
            request_id: "ce819fe8-b1d7-43bb-961c-e09ede0988d3",
            participant_code: "CUST01",
            quoted_currency: "INR",
            side: "BUY",
            quantity: "1",
            price: "11430.90",
            quote_id: "5cd07738b861c31e3bd61467BTC1Buy1568311644602",
            expire_ts: 1568311649602,
            account_group: "GRP001",
            account_label: "general",
            obo_participant: {
              participant_code: "20XRLH",
              account_group: "WRD1K0",
              account_label: "general",
            },
            network_fee_notional: "1",
            network_fee_quantity: "1",
            total_notional: "2.00",
            underlying: "BTC",
            asset_cost_notional: "2.00",
          },
        },
      };
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      try {
        await zerohashService.requestQuoteForDesiredCryptoQuantity("BTC", "USD", 1);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
      }

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
    });
  });

  describe("requestQuoteforFixedFiatCurrency()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("success", async () => {
      const cryptoCurrency = "BTC";
      const fiatAmount = 11430.9;
      const fiatCurrency = "USD";

      const axiosConfig = getAxiosConfig(
        "GET",
        `/liquidity/rfq?underlying=${cryptoCurrency}&quoted_currency=${fiatCurrency}&side=buy&total=${fiatAmount}`,
      );
      const zhResponse = {
        status: 200,
        data: {
          message: {
            request_id: "ce819fe8-b1d7-43bb-961c-e09ede0988d3",
            participant_code: "CUST01",
            quoted_currency: "USD",
            side: "BUY",
            quantity: "1",
            price: "11430.90",
            quote_id: "5cd07738b861c31e3bd61467BTC1Buy1568311644602",
            expire_ts: 1568311649602,
            account_group: "GRP001",
            account_label: "general",
            obo_participant: {
              participant_code: "20XRLH",
              account_group: "WRD1K0",
              account_label: "general",
            },
            network_fee_notional: "1",
            network_fee_quantity: "1",
            total_notional: "2.00",
            underlying: "BTC",
            asset_cost_notional: "2.00",
          },
        },
      };
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.requestQuoteForFixedFiatCurrency("BTC", "USD", 11430.9);

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      const expectedResponse = {
        quoteID: "5cd07738b861c31e3bd61467BTC1Buy1568311644602",
        expireTimestamp: 1568311649602,
        cryptoCurrency: "BTC",
        fiatCurrency: "USD",
        perUnitCryptoAssetCost: "11430.90",
      };
      expect(response).toStrictEqual(expectedResponse);
    });

    it("fail", async () => {
      const cryptoCurrency = "BTC";
      const fiatAmount = 11430.9;
      const fiatCurrency = "USD";

      const axiosConfig = getAxiosConfig(
        "GET",
        `/liquidity/rfq?underlying=${cryptoCurrency}&quoted_currency=${fiatCurrency}&side=buy&total=${fiatAmount}`,
      );
      const zhResponse = {
        status: 200,
        data: {
          message: {
            request_id: "ce819fe8-b1d7-43bb-961c-e09ede0988d3",
            participant_code: "CUST01",
            quoted_currency: "INR",
            side: "BUY",
            quantity: "1",
            price: "11430.90",
            quote_id: "5cd07738b861c31e3bd61467BTC1Buy1568311644602",
            expire_ts: 1568311649602,
            account_group: "GRP001",
            account_label: "general",
            obo_participant: {
              participant_code: "20XRLH",
              account_group: "WRD1K0",
              account_label: "general",
            },
            network_fee_notional: "1",
            network_fee_quantity: "1",
            total_notional: "2.00",
            underlying: "BTC",
            asset_cost_notional: "2.00",
          },
        },
      };
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      try {
        await zerohashService.requestQuoteForFixedFiatCurrency("BTC", "USD", 11430.9);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
      }

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
    });
  });

  describe("requestWithdrawal()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("request withdrawal without smart contract data", async () => {
      const requestData = {
        address: "test-address",
        participant_code: "test-code",
        amount: "10",
        asset: "ETH",
        account_group: "test-group",
      };
      const axiosConfig = getAxiosConfig("POST", "/withdrawals/requests", requestData);
      const zhResponse = {
        status: 200,
        data: {
          message: {
            id: "123",
            client_withdrawal_request_id: "c6af3d80-1aca-4280-b96b-a9b8d7ced46a",
            withdrawal_account_id: "146",
            address: "2NCgV7BXXafJZ86utcYFs5m3tCpkcpLafeG",
            account: {
              name: "string",
              limit: 0,
              type: "string",
              beneficiary_name: "string",
              account_number: "string",
              bank_name: "string",
              routing_number: "string",
              swift_code: "string",
              recipient_instructions: "string",
              intermediary_bank_name: "string",
              intermediary_bank_code_type: "string",
              intermediary_bank_code: "string",
              intermediary_bank_account_number: "string",
              correspondent_bank_name: "string",
              correspondent_bank_code_type: "string",
              correspondent_bank_code: "string",
              correspondent_bank_account_number: "string",
            },
            participant_code: "ABCDEF",
            account_group: "00SCXM",
            amount: "20.1",
            asset: "BTC",
            destination_tag: "string",
            no_destination_tag: false,
            gas_price: "string",
            input_data: "string",
            trade_id: "string",
          },
        },
      };
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const responsePromise = zerohashService.requestWithdrawal("test-address", 10, "ETH", "test-code", "test-group");

      const response = await responsePromise;
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      expect(response).toBe("123");
    });

    it("request withdrawal with smart contract data", async () => {
      const requestData = {
        address: "test-address",
        participant_code: "test-code",
        amount: "10",
        asset: "ETH",
        account_group: "test-group",
        input_data: "test-smart-contract",
      };
      const axiosConfig = getAxiosConfig("POST", "/withdrawals/requests", requestData);
      const zhResponse = {
        status: 200,
        data: {
          message: {
            id: "123",
            client_withdrawal_request_id: "c6af3d80-1aca-4280-b96b-a9b8d7ced46a",
            withdrawal_account_id: "146",
            address: "2NCgV7BXXafJZ86utcYFs5m3tCpkcpLafeG",
            account: {
              name: "string",
              limit: 0,
              type: "string",
              beneficiary_name: "string",
              account_number: "string",
              bank_name: "string",
              routing_number: "string",
              swift_code: "string",
              recipient_instructions: "string",
              intermediary_bank_name: "string",
              intermediary_bank_code_type: "string",
              intermediary_bank_code: "string",
              intermediary_bank_account_number: "string",
              correspondent_bank_name: "string",
              correspondent_bank_code_type: "string",
              correspondent_bank_code: "string",
              correspondent_bank_account_number: "string",
            },
            participant_code: "ABCDEF",
            account_group: "00SCXM",
            amount: "20.1",
            asset: "BTC",
            destination_tag: "string",
            no_destination_tag: false,
            gas_price: "string",
            input_data: "string",
            trade_id: "string",
          },
        },
      };
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const responsePromise = zerohashService.requestWithdrawal(
        "test-address",
        10,
        "ETH",
        "test-code",
        "test-group",
        "test-smart-contract",
      );

      const response = await responsePromise;
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      expect(response).toBe("123");
    });
  });

  describe("getTransfer()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("test get transfer id", async () => {
      const axiosConfig = getAxiosConfig("GET", "/transfers/78");
      const zhResponse = {
        status: 200,
        data: {
          message: {
            id: 78,
            created_at: "2020-09-01T20:53:31.653Z",
            updated_at: "2020-09-01T20:53:31.653Z",
            status: "settled",
            requested_amount: "23",
            settled_amount: "21",
            from_participant_code: "ABC123",
            from_account_group: "ABCDEF",
            from_account_label: "general",
            to_participant_code: "DEMO01",
            to_account_group: "ABCDEF",
            to_account_label: "general",
            asset: "BTC",
            amount: "100.00",
            movement_id: "1902a0eb-a925-4d08-bcad-ea8ed4696a24",
            client_transfer_id: "e6afed46-301e-46ee-a339-e897e9855c3a",
          },
        },
      };
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const response = await zerohashService.getTransfer("78");

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      expect(response.id).toBe(78);
    });
  });

  describe("executeQuote()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("execute quote", async () => {
      const axiosConfig = getAxiosConfig("POST", "/liquidity/execute", {
        quote_id: "5cd07738b861c31e3bd61467BTC1Buy1568311644602",
      });
      const zhResponse = {
        status: 200,
        data: {
          message: {
            request_id: "14f8ebb8-7530-4aa4-bef9-9d73d56313f3",
            quote: {
              request_id: "ce819fe8-b1d7-43bb-961c-e09ede0988d3",
              participant_code: "CUST01",
              quoted_currency: "USD",
              side: "BUY",
              quantity: "1",
              price: "11430.90",
              quote_id: "5cd07738b861c31e3bd61467BTC1Buy1568311644602",
              expire_ts: 1568311649602,
              account_group: "GRP001",
              account_label: "general",
              obo_participant: {
                participant_code: "20XRLH",
                account_group: "WRD1K0",
                account_label: "general",
              },
              network_fee_notional: "1",
              network_fee_quantity: "1",
              total_notional: "2.00",
              underlying: "BTC",
              asset_cost_notional: "2.00",
            },
            trade_id: "ba97133e-ab15-4c86-86c1-86671b8420bc",
            status: "Completed",
            ach_details: {
              external_account_id: "string",
              inbound_reference_id: "string",
              bank_fee: "string",
              payment_amount: "string",
            },
          },
        },
      };
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const responsePromise = zerohashService.executeQuote("5cd07738b861c31e3bd61467BTC1Buy1568311644602");

      const response = await responsePromise;
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      console.log(`Response: ${response}`);
      const expectedResponse = {
        tradePrice: Number(11430.9),
        cryptoReceived: Number(1),
        quoteID: "5cd07738b861c31e3bd61467BTC1Buy1568311644602",
        tradeID: "ba97133e-ab15-4c86-86c1-86671b8420bc",
        cryptocurrency: "BTC",
      };
      expect(response).toStrictEqual(expectedResponse);
    });
  });

  describe("getParticipantBalance()", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("get participant balance", async () => {
      const participantID = "ABCDEF";
      const axiosConfig = getAxiosConfig("GET", `/accounts?account_owner=${participantID}`);
      const zhResponse = {
        status: 200,
        data: {
          message: [
            {
              asset: "USD",
              account_owner: "ABCDEF",
              account_type: "collateral_deficiency",
              account_group: "XYZ456",
              account_label: "general",
              balance: "0.00",
              account_id: "ce819fe8-b1d7-43bb-961c-e09ede0988d3",
              last_update: 1554395972174,
            },
          ],
          page: 1,
          total_pages: 1,
        },
      };
      // The lib we use for sardine test i.e. jest-mock-axios didn't work, so we are going ahead with jest.SpyOn
      // Reasons for the above are still unidentified though
      const getSpy = jest.spyOn(axios, "request").mockResolvedValue(zhResponse);
      const responsePromise = zerohashService.getParticipantBalance("ABCDEF");

      const response = await responsePromise;
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(axiosConfig);
      console.log(`Response: ${response}`);
      const expectedResponse = [
        {
          accountGroup: "XYZ456",
          accountID: "ce819fe8-b1d7-43bb-961c-e09ede0988d3",
          accountLabel: "general",
          accountOwner: "ABCDEF",
          accountType: "collateral_deficiency",
          asset: "USD",
          balance: "0.00",
          lastUpdate: 1554395972174,
        },
      ];
      expect(response).toStrictEqual(expectedResponse);
    });
  });

  function getMockWithdrawalResponse(status, onChainStatus?) {
    return {
      status: 200,
      data: {
        message: [
          {
            id: 78,
            withdrawal_account_id: 51,
            participant_code: "ABCDEF",
            requestor_participant_code: "ABCDEF",
            requested_amount: "23",
            settled_amount: "21",
            status: status,
            asset: "BTC",
            account_group: "00SCXM",
            transaction_id: null,
            requested_timestamp: 1554395972174,
            gas_price: null,
            client_withdrawal_request_id: null,
            on_chain_status: onChainStatus ? onChainStatus : "PENDING",
            fee_amount: "0.003163149641603118",
          },
        ],
      },
    };
  }
});