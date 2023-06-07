import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../src/core/utils/WinstonModule";
import {
  AppEnvironment,
  NOBA_APP_SECRET_KEY,
  NOBA_CONFIG_KEY,
  NODE_ENV_CONFIG_KEY,
} from "../../../config/ConfigurationUtils";
import { HeaderValidationService } from "../header.validation.service";
import { BadRequestException } from "@nestjs/common";
import CryptoJS from "crypto-js";
import { HmacSHA256 } from "crypto-js";
import { AlertService } from "../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../modules/common/mocks/mock.alert.service";
import { instance } from "ts-mockito";

describe("HeaderValidationService", () => {
  jest.setTimeout(5000);

  let headerValidationService: HeaderValidationService;
  let mockAlertService: AlertService;

  describe("non-prod environment tests", () => {
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
    /**
     *
     * This will be used to configure the testing module and will decouple
     * the testing module from the actual module.
     *
     * Never hard-code the environment variables "KEY_NAME" in the testing module.
     * All the keys used in 'appconfigs' are defined in
     * `config/ConfigurationUtils` and it should be used for all the testing modules.
     *
     **/
    const appConfigurations = {
      [NODE_ENV_CONFIG_KEY]: AppEnvironment.DEV,
      [NOBA_CONFIG_KEY]: {
        [NOBA_APP_SECRET_KEY]: "dev-fake-embed-secret",
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    beforeEach(async () => {
      mockAlertService = getMockAlertServiceWithDefaults();
      const app: TestingModule = await Test.createTestingModule({
        imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
        controllers: [],
        providers: [
          HeaderValidationService,
          {
            provide: AlertService,
            useFactory: () => instance(mockAlertService),
          },
        ],
      }).compile();

      process.env.NODE_ENV = AppEnvironment.DEV;

      headerValidationService = app.get<HeaderValidationService>(HeaderValidationService);
    });

    it("should bypass signature checks if values are not provided", async () => {
      const response = await headerValidationService.validateApiKeyAndSignature(
        /* apiKey= */ null,
        /* timestamp= */ null,
        /* signature= */ null,
        /* requestMethod= */ "POST",
        /* requestPath= */ "/v1/auth/login",
        /* requestBody= */ "fake-body",
      );

      expect(response).toBe(true);
    });

    it("should validate signature and throw error when values are provided and API Key is not found", async () => {
      const apiKey = "fake-api-key";

      try {
        await headerValidationService.validateApiKeyAndSignature(
          /* apiKey= */ apiKey,
          /* timestamp= */ new Date().getTime().toString(),
          /* signature= */ "fake-signature",
          /* requestMethod= */ "POST",
          /* requestPath= */ "/v1/auth/login",
          /* requestBody= */ "fake-body",
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    /*it("should validate when values are provided and return true if signature matches for API integration mode", async () => {
      const apiKey = "fake-api-key";
      const timestamp = new Date().getTime().toString();
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${method}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));

      const response = await headerValidationService.validateApiKeyAndSignature(
        apiKey,
        timestamp,
        hmacSignatureString,
        method,
        url,
        body,
      );

      expect(response).toBe(true);
    });*/

    it("should validate when values are provided and return true if signature matches for EMBED integration mode", async () => {
      const apiKey = "fake-api-key";
      const timestamp = new Date().getTime().toString();
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const utf8Secret = CryptoJS.enc.Utf8.parse("dev-fake-embed-secret");
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${method}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));

      const response = await headerValidationService.validateApiKeyAndSignature(
        apiKey,
        timestamp,
        hmacSignatureString,
        method,
        url,
        body,
      );

      expect(response).toBe(true);
    });

    /*it("should validate when values are provided and throw error if signature does not match for API integration mode", async () => {
      const apiKey = "fake-api-key";
      const timestamp = new Date().getTime().toString();
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${"POST"}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));

      try {
        await headerValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          hmacSignatureString,
          method,
          url,
          body,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });*/

    it("should validate when values are provided and throw error if signature does not match for EMBED integration mode", async () => {
      const apiKey = "fake-api-key";
      const timestamp = new Date().getTime().toString();
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${"POST"}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));

      try {
        await headerValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          hmacSignatureString,
          method,
          url,
          body,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    it("should throw error if timestamp is not proper", async () => {
      const apiKey = "fake-api-key";
      const timestamp = "fake-timestamp";
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${method}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));

      try {
        await headerValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          hmacSignatureString,
          method,
          url,
          body,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe("Timestamp is not a correct timestamp");
      }
    });

    it("should throw error if timestamp is older than 5 minutes", async () => {
      const apiKey = "fake-api-key";
      const timestamp = new Date();
      timestamp.setMinutes(timestamp.getMinutes() - 6);
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${method}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));

      try {
        await headerValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp.getTime().toString(),
          hmacSignatureString,
          method,
          url,
          body,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe("Timestamp is more than 5 minutes different than expected");
      }
    });
  });

  describe("prod environment tests", () => {
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
    /**
     *
     * This will be used to configure the testing module and will decouple
     * the testing module from the actual module.
     *
     * Never hard-code the environment variables "KEY_NAME" in the testing module.
     * All the keys used in 'appconfigs' are defined in
     * `config/ConfigurationUtils` and it should be used for all the testing modules.
     *
     **/
    const appConfigurations = {
      [NODE_ENV_CONFIG_KEY]: AppEnvironment.PROD,
      [NOBA_CONFIG_KEY]: {
        [NOBA_APP_SECRET_KEY]: "prod-fake-embed-secret",
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    beforeEach(async () => {
      const app: TestingModule = await Test.createTestingModule({
        imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
        controllers: [],
        providers: [
          HeaderValidationService,
          {
            provide: AlertService,
            useFactory: () => instance(mockAlertService),
          },
        ],
      }).compile();
      process.env.NODE_ENV = AppEnvironment.PROD;
      headerValidationService = app.get<HeaderValidationService>(HeaderValidationService);
    });

    it("should not bypass signature checks if values are not provided", async () => {
      try {
        await headerValidationService.validateApiKeyAndSignature(
          /* apiKey= */ null,
          /* timestamp= */ null,
          /* signature= */ null,
          /* requestMethod= */ "POST",
          /* requestPath= */ "/v1/auth/login",
          /* requestBody= */ "fake-body",
        );
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    /*it("should validate when values are provided and return true if signature matches for API integration", async () => {
      const apiKey = "fake-api-key";
      const timestamp = new Date().getTime().toString();
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});

      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${method}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));

      const response = await headerValidationService.validateApiKeyAndSignature(
        apiKey,
        timestamp,
        hmacSignatureString,
        method,
        url,
        body,
      );

      expect(response).toBe(true);
    });*/

    it("should validate when values are provided and return true if signature matches for EMBED integration", async () => {
      const apiKey = "fake-api-key";
      const timestamp = new Date().getTime().toString();
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const utf8Secret = CryptoJS.enc.Utf8.parse("prod-fake-embed-secret");
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${method}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));

      const response = await headerValidationService.validateApiKeyAndSignature(
        apiKey,
        timestamp,
        hmacSignatureString,
        method,
        url,
        body,
      );

      expect(response).toBe(true);
    });

    it("should validate when values are provided and throw error if signature does not match", async () => {
      const apiKey = "fake-api-key";
      const timestamp = new Date().getTime().toString();
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${"POST"}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));

      try {
        await headerValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          hmacSignatureString,
          method,
          url,
          body,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });
});
