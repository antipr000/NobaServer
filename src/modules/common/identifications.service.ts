import { Injectable, NotFoundException } from "@nestjs/common";
import { readFileSync } from "fs";
import path from "path";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

import { IDENTIFICATION_TYPES_FILE_PATH } from "../../config/ConfigurationUtils";
import { IdentificationTypeDTO } from "./dto/identification.type.dto";
import { IdentificationType } from "./domain/IdentificationTypes";
import { IdentificationTypeCountryDTO } from "./dto/identification.type.country.dto";

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

    this.identificationTypes = identificationTypes;
  }

  getIdentificationTypes(): IdentificationTypeCountryDTO[] {
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

  getIdentificationTypesForCountry(countryCode: string): IdentificationTypeCountryDTO {
    if (!this.isIdentificationTypesLoaded) {
      this.loadIdentificationTypesFromFile();
      this.isIdentificationTypesLoaded = true;
    }

    const identificationTypes = this.identificationTypes.get(countryCode);
    if (!identificationTypes) {
      throw new NotFoundException(`No identification types found for country code ${countryCode}`);
    }

    return {
      countryCode: countryCode,
      identificationTypes: identificationTypes,
    };
  }
}
