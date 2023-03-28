import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IdentificationService } from "../identifications.service";
import { ServiceErrorCode } from "src/core/exception/service.exception";

describe("Identification", () => {
  let identificationService: IdentificationService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
      IDENTIFICATION_TYPES_FILE_PATH: __dirname.split("src")[0] + "/appconfigs/identification-types.json",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [IdentificationService],
    }).compile();

    identificationService = app.get<IdentificationService>(IdentificationService);
  });

  describe("Identification service tests", () => {
    describe("getIdentificationTypes", () => {
      it("should return identification types", async () => {
        const identificationTypes = await identificationService.getIdentificationTypes();
        expect(identificationTypes.length).toBeGreaterThan(0);
        expect(identificationTypes[0].countryCode).toBe("CO");
        expect(identificationTypes[0].identificationTypes.length).toBeGreaterThan(0);
        expect(identificationTypes[0].identificationTypes.some(type => type.name === "Pasaporte")).toBeTruthy();
      });
    });

    describe("getIdentificationTypesForCountry", () => {
      it("should return identification type by country", async () => {
        const identificationType = await identificationService.getIdentificationTypesForCountry("CO");
        expect(identificationType.countryCode).toBe("CO");
        expect(identificationType.identificationTypes.length).toBeGreaterThan(0);
      });

      it("should throw exception when country code is is not found", async () => {
        expect(identificationService.getIdentificationTypesForCountry("XX")).rejects.toThrowServiceException(
          ServiceErrorCode.DOES_NOT_EXIST,
        );
      });
    });

    describe("isIdentificationTypeValid", () => {
      it("should throw exception when identification type for country is not found", async () => {
        expect(identificationService.isIdentificationTypeValid("XX", "XX", "123456")).rejects.toThrowServiceException(
          ServiceErrorCode.DOES_NOT_EXIST,
        );
      });

      it("should throw exception when identification type is not found", async () => {
        expect(identificationService.isIdentificationTypeValid("CO", "XX", "123456")).rejects.toThrowServiceException(
          ServiceErrorCode.DOES_NOT_EXIST,
        );
      });

      it("should throw exception when identification value is greater than max length", async () => {
        expect(
          identificationService.isIdentificationTypeValid("CO", "CC", "123456789012345678901"),
        ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION, "length");
      });

      it("should throw exception when identification value does not match the regex", async () => {
        expect(
          identificationService.isIdentificationTypeValid("CO", "CC", "fake-Cedula"),
        ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION, "format");
      });
      it("should not throw when identification value is valid", async () => {
        await identificationService.isIdentificationTypeValid("CO", "CC", "9876543210");
      });
    });
  });
});
