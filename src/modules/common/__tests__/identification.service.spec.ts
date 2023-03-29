import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IdentificationService } from "../identification.service";
import { ServiceErrorCode } from "src/core/exception/service.exception";
import { AppEnvironment } from "../../../config/ConfigurationUtils";

describe("Identification", () => {
  let identificationService: IdentificationService;

  jest.setTimeout(30000);

  describe("Identification service prod tests", () => {
    beforeEach(async () => {
      process.env = {
        ...process.env,
        NODE_ENV: AppEnvironment.PROD,
        IDENTIFICATION_TYPES_FILE_PATH: __dirname.split("src")[0] + "/appconfigs/identification-types.json",
      };

      const app: TestingModule = await Test.createTestingModule({
        imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
        controllers: [],
        providers: [IdentificationService],
      }).compile();

      identificationService = app.get<IdentificationService>(IdentificationService);
    });

    describe("getIdentificationTypes", () => {
      it("should return identification types", async () => {
        const identificationTypes = await identificationService.getIdentificationTypes();
        expect(identificationTypes.length).toBe(1);
        expect(identificationTypes.map(type => type.countryCode)).toContain("CO");
        expect(identificationTypes.find(type => type.countryCode === "CO").identificationTypes.length).toBe(4);
        // check all the keys are correct
        identificationTypes
          .find(type => type.countryCode === "CO")
          .identificationTypes.forEach(type => {
            expect(type).toHaveProperty("type");
            expect(type).toHaveProperty("name");
            expect(type).toHaveProperty("regex");
            expect(type).toHaveProperty("maxLength");
          });
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
        expect(identificationService.validateIdentificationType("XX", "XX", "123456")).rejects.toThrowServiceException(
          ServiceErrorCode.DOES_NOT_EXIST,
        );
      });

      it("should throw exception when identification type is not found", async () => {
        expect(identificationService.validateIdentificationType("CO", "XX", "123456")).rejects.toThrowServiceException(
          ServiceErrorCode.DOES_NOT_EXIST,
        );
      });

      it("should throw exception when identification value is greater than max length", async () => {
        expect(
          identificationService.validateIdentificationType("CO", "CC", "123456789012345678901"),
        ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION, "length");
      });

      it("should throw exception when identification value does not match the regex", async () => {
        expect(identificationService.validateIdentificationType("CO", "CC", "fake-CC")).rejects.toThrowServiceException(
          ServiceErrorCode.SEMANTIC_VALIDATION,
          "format",
        );
      });
      it("should not throw when identification value is valid", async () => {
        await identificationService.validateIdentificationType("CO", "CC", "9876543210");
      });
    });
  });

  describe("Identification service mock tests", () => {
    beforeEach(async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "development",
        IDENTIFICATION_TYPES_FILE_PATH: __dirname.split("src")[0] + "/appconfigs/identification-types-mock.json",
      };

      const app: TestingModule = await Test.createTestingModule({
        imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
        controllers: [],
        providers: [IdentificationService],
      }).compile();

      identificationService = app.get<IdentificationService>(IdentificationService);
    });

    describe("getIdentificationTypes", () => {
      it("should return identification types", async () => {
        const identificationTypes = await identificationService.getIdentificationTypes();
        expect(identificationTypes.length).toBe(2);
        expect(identificationTypes).toContainEqual({
          countryCode: "CO",
          identificationTypes: [
            {
              type: "CC",
              name: "Cedula de Ciudania",
              maxLength: 10,
              regex: "^[1-9]{1}[0-9]{9}$",
            },
            {
              type: "PEP",
              name: "Persona Expuesta Políticamente",
              maxLength: 10,
              regex: ".*",
            },
            {
              type: "CE",
              name: "Cédula de Extranjería",
              maxLength: 10,
              regex: "^E\\d{9}$",
            },
            {
              type: "PASSPORT",
              name: "Pasaporte",
              maxLength: 10,
              regex: "^[A-Z]{2}\\d{6}[A-Z]{2}$",
            },
          ],
        });
        expect(identificationTypes).toContainEqual({
          countryCode: "US",
          identificationTypes: [
            {
              type: "PASSPORT",
              name: "Passport",
              maxLength: 9,
              pattern: "^[0-9]{9}$",
            },
            {
              type: "SSN",
              name: "Social Security Number",
              maxLength: 9,
              pattern: "^[0-9]{9}$",
            },
            {
              type: "DRIVERS_LICENSE",
              name: "Driver's License",
              maxLength: 8,
              pattern: "^[A-Za-z]{1}[0-9]{7}$",
            },
          ],
        });
      });
    });

    describe("getIdentificationTypesForCountry", () => {
      it("should return identification type by country", async () => {
        const identificationType = await identificationService.getIdentificationTypesForCountry("US");
        expect(identificationType.identificationTypes).toContainEqual({
          type: "PASSPORT",
          name: "Passport",
          maxLength: 9,
          pattern: "^[0-9]{9}$",
        });
        expect(identificationType.identificationTypes).toContainEqual({
          type: "SSN",
          name: "Social Security Number",
          maxLength: 9,
          pattern: "^[0-9]{9}$",
        });
        expect(identificationType.identificationTypes).toContainEqual({
          type: "DRIVERS_LICENSE",
          name: "Driver's License",
          maxLength: 8,
          pattern: "^[A-Za-z]{1}[0-9]{7}$",
        });
      });
    });
  });
});
