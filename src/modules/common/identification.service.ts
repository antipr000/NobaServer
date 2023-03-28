import { Injectable, NotFoundException } from "@nestjs/common";
import { readFileSync } from "fs";
import path from "path";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

import { IDENTIFICATION_TYPES_FILE_PATH } from "../../config/ConfigurationUtils";
import { IdentificationType } from "./domain/IdentificationTypes";
import { IdentificationTypeCountryDTO } from "./dto/identification.type.country.dto";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";

@Injectable()
export class IdentificationService {
  /*
    Locations stores the locations without subdivisions and locationsWithSubdivisions includes subdivisions.
    Even though this results in duplication of data, it is more efficient than simply storing once with subdivisions
    and excluding subdivisions at runtime if requested to not include them.
  */
  private identificationTypes: Map<string, IdentificationType[]>;
  private isIdentificationTypesLoaded: boolean;

  constructor(private readonly configService: CustomConfigService) {
    this.isIdentificationTypesLoaded = false;
  }

  private loadIdentificationTypesFromFile() {
    const identificationTypesRaw = readFileSync(
      path.resolve(this.configService.get(IDENTIFICATION_TYPES_FILE_PATH)),
      "utf-8",
    );

    const identificationTypes = JSON.parse(identificationTypesRaw);

    this.identificationTypes = new Map<string, IdentificationType[]>(Object.entries(identificationTypes));
  }

  async getIdentificationTypes(): Promise<IdentificationTypeCountryDTO[]> {
    if (!this.isIdentificationTypesLoaded) {
      this.loadIdentificationTypesFromFile();
      this.isIdentificationTypesLoaded = true;
    }

    const identificationTypes = [];
    this.identificationTypes.forEach((value, key) => {
      identificationTypes.push({ countryCode: key, identificationTypes: value });
    });

    return identificationTypes;
  }

  async getIdentificationTypesForCountry(countryCode: string): Promise<IdentificationTypeCountryDTO> {
    if (!this.isIdentificationTypesLoaded) {
      this.loadIdentificationTypesFromFile();
      this.isIdentificationTypesLoaded = true;
    }

    const identificationTypes = this.identificationTypes.get(countryCode.toUpperCase());
    if (!identificationTypes) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: `No identification types found for country code ${countryCode}`,
      });
    }

    return {
      countryCode: countryCode,
      identificationTypes: identificationTypes,
    };
  }

  async isIdentificationTypeValid(countryCode: string, identificationType: string, identificationValue: string) {
    if (!this.isIdentificationTypesLoaded) {
      this.loadIdentificationTypesFromFile();
      this.isIdentificationTypesLoaded = true;
    }

    const foundIdentificationTypes = this.identificationTypes.get(countryCode.toUpperCase());
    if (!foundIdentificationTypes) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: `No identification types found for country code ${countryCode}`,
      });
    }

    const foundIdentificationType = foundIdentificationTypes.find(type => type.type === identificationType);
    if (!foundIdentificationType) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: `No identification type found for type ${identificationType}`,
      });
    }

    if (foundIdentificationType.maxLength < identificationValue.length) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Identification value exceeds maximum length of ${foundIdentificationType.maxLength}`,
      });
    }

    const regex = new RegExp(foundIdentificationType.regex);
    if (!regex.test(identificationValue)) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Identification value does not match the expected format`,
      });
    }
  }
}
