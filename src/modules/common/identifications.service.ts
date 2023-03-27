import { Injectable, NotFoundException } from "@nestjs/common";
import { readFileSync } from "fs";
import path from "path";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

import { IDENTIFICATION_TYPES_FILE_PATH } from "../../config/ConfigurationUtils";
import { IdentificationTypeDTO } from "./dto/Identification.type.dto";

@Injectable()
export class IdentificationService {
  /*
    Locations stores the locations without subdivisions and locationsWithSubdivisions includes subdivisions.
    Even though this results in duplication of data, it is more efficient than simply storing once with subdivisions
    and excluding subdivisions at runtime if requested to not include them.
  */
  private identificationTypes: Map<string, IdentificationTypeDTO>;
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

  getIdentificationTypes(): Map<string, IdentificationTypeDTO> {
    if (!this.isIdentificationTypesLoaded) {
      this.loadIdentificationTypesFromFile();
      this.isIdentificationTypesLoaded = true;
    }
    return this.identificationTypes;
  }
  getIdentificationTypesByCountryCode(countryCode: string): IdentificationTypeDTO {
    if (!this.isIdentificationTypesLoaded) {
      this.loadIdentificationTypesFromFile();
      this.isIdentificationTypesLoaded = true;
    }

    return this.identificationTypes.get(countryCode);
  }
}
