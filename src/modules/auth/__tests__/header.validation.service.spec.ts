import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../src/core/utils/WinstonModule";
import { AppEnvironment, NODE_ENV_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { HeaderValidationService } from "../header.validation.service";
import { PartnerService } from "../../../modules/partner/partner.service";
import { getMockPartnerServiceWithDefaults } from "../../../modules/partner/mocks/mock.partner.service";
import { instance, when } from "ts-mockito";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Partner } from "../../../modules/partner/domain/Partner";
import * as CryptoJS from "crypto-js";
import { HmacSHA256 } from "crypto-js";

describe("HeaderValidationService", () => {
  jest.setTimeout(5000);

  let headerValidationService: HeaderValidationService;
  let partnerService: PartnerService;

  describe("non-prod environment tests", () => {
    partnerService = getMockPartnerServiceWithDefaults();
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
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    beforeEach(async () => {
      const app: TestingModule = await Test.createTestingModule({
        imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
        controllers: [],
        providers: [
          HeaderValidationService,
          {
            provide: PartnerService,
            useFactory: () => instance(partnerService),
          },
        ],
      }).compile();

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

      when(partnerService.getPartnerFromApiKey(apiKey)).thenReject(new NotFoundException("Not found"));

      try {
        await headerValidationService.validateApiKeyAndSignature(
          /* apiKey= */ apiKey,
          /* timestamp= */ "fake-timestamp",
          /* signature= */ "fake-signature",
          /* requestMethod= */ "POST",
          /* requestPath= */ "/v1/auth/login",
          /* requestBody= */ "fake-body",
        );
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    it("should validate when values are provided and return true if signature matches", async () => {
      const apiKey = "fake-api-key";
      const timestamp = "fake-timestamp";
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const partner = Partner.createPartner({
        _id: "fake-id-1234",
        apiKey: apiKey,
        secretKey: secretKey,
        name: "Fake Partner",
      });
      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${method}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));
      when(partnerService.getPartnerFromApiKey(apiKey)).thenResolve(partner);

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
      const timestamp = "fake-timestamp";
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const partner = Partner.createPartner({
        _id: "fake-id-1234",
        apiKey: apiKey,
        secretKey: secretKey,
        name: "Fake Partner",
      });
      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${"POST"}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));
      when(partnerService.getPartnerFromApiKey(apiKey)).thenResolve(partner);

      try {
        await headerValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          hmacSignatureString,
          method,
          url,
          body,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe("staging/prod environment tests", () => {
    partnerService = getMockPartnerServiceWithDefaults();
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
      [NODE_ENV_CONFIG_KEY]: AppEnvironment.STAGING,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    beforeEach(async () => {
      const app: TestingModule = await Test.createTestingModule({
        imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
        controllers: [],
        providers: [
          HeaderValidationService,
          {
            provide: PartnerService,
            useFactory: () => instance(partnerService),
          },
        ],
      }).compile();

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

    it("should validate when values are provided and return true if signature matches", async () => {
      const apiKey = "fake-api-key";
      const timestamp = "fake-timestamp";
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const partner = Partner.createPartner({
        _id: "fake-id-1234",
        apiKey: apiKey,
        secretKey: secretKey,
        name: "Fake Partner",
      });
      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${method}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));
      when(partnerService.getPartnerFromApiKey(apiKey)).thenResolve(partner);

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
      const timestamp = "fake-timestamp";
      const secretKey = "fake-secret-key";
      const method = "GET";
      const url = "/v1/fake/path";
      const body = JSON.stringify({});
      const partner = Partner.createPartner({
        _id: "fake-id-1234",
        apiKey: apiKey,
        secretKey: secretKey,
        name: "Fake Partner",
      });
      const utf8Secret = CryptoJS.enc.Utf8.parse(secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${apiKey}${"POST"}${url}${body}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, utf8Secret));
      when(partnerService.getPartnerFromApiKey(apiKey)).thenResolve(partner);

      try {
        await headerValidationService.validateApiKeyAndSignature(
          apiKey,
          timestamp,
          hmacSignatureString,
          method,
          url,
          body,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });
});
