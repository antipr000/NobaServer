import { Injectable, NotFoundException } from "@nestjs/common";
import { readFileSync } from "fs";
import path from "path";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { LocationDTO, SubdivisionDTO } from "./dto/LocationDTO";
import {
  ZEROHASH_COUNTRY_MAPPING,
  EXCLUDED_COUNTRY_CODES,
  EXCLUDED_SUBDIVISIONS,
  INCLUDED_SUBDIVISIONS,
} from "./SupportedLocations";
import { LOCATION_DATA_FILE_PATH } from "../../config/ConfigurationUtils";

@Injectable()
export class LocationService {
  /*
    Locations stores the locations without subdivisions and locationsWithSubdivisions includes subdivisions.
    Even though this results in duplication of data, it is more efficient than simply storing once with subdivisions
    and excluding subdivisions at runtime if requested to not include them.
  */
  private locations: Array<LocationDTO>;
  private locationsWithSubdivisions: Array<LocationDTO>;
  private isLocationsLoaded: boolean;

  constructor(private readonly configService: CustomConfigService) {
    this.isLocationsLoaded = false;
  }

  private loadLocationsFromFile() {
    const results = new Array<LocationDTO>();
    const resultsWithSubdivisions = new Array<LocationDTO>();

    const locationDataRaw = readFileSync(path.resolve(this.configService.get(LOCATION_DATA_FILE_PATH)), "utf-8");

    const locationData = JSON.parse(locationDataRaw);

    locationData.forEach(element => {
      // Skip excluded countries
      if (EXCLUDED_COUNTRY_CODES.indexOf(element.iso2) == -1) {
        // Skip any countries not mapped to Zerohash country names
        const zhCountryName: string = ZEROHASH_COUNTRY_MAPPING[element.iso2];
        if (zhCountryName != undefined) {
          // Get subdivision data
          const subdivisions = new Array<SubdivisionDTO>();
          element.states.forEach(subdivision => {
            // Ensure subdivision code is in the include list if defined for the country
            if (
              INCLUDED_SUBDIVISIONS[element.iso2] == undefined ||
              INCLUDED_SUBDIVISIONS[element.iso2].indexOf(subdivision.state_code) > -1
            ) {
              // If also in the exclude list, store with supported=false.
              if (
                EXCLUDED_SUBDIVISIONS[element.iso2] != undefined &&
                EXCLUDED_SUBDIVISIONS[element.iso2].indexOf(subdivision.state_code) > -1
              ) {
                subdivisions.push({ name: subdivision.name, code: subdivision.state_code, supported: false });
              } else {
                subdivisions.push({ name: subdivision.name, code: subdivision.state_code });
              }
            }
          });

          // Store with subdivision data
          resultsWithSubdivisions.push({
            countryName: element.name,
            countryISOCode: element.iso2,
            subdivisions: subdivisions,
            alternateCountryName: zhCountryName,
            alpha3ISOCode: element.iso3,
            dialingPrefix: element.phone_code,
          });

          // Store without subdivision data
          results.push({
            countryName: element.name,
            countryISOCode: element.iso2,
            alternateCountryName: zhCountryName,
            alpha3ISOCode: element.iso3,
            dialingPrefix: element.phone_code,
          });
        }
      }
    });

    this.locations = results;
    this.locationsWithSubdivisions = resultsWithSubdivisions;
  }

  getLocations(includeSubdivisions: boolean): Array<LocationDTO> {
    if (!this.isLocationsLoaded) {
      this.loadLocationsFromFile();
      this.isLocationsLoaded = true;
    }

    return includeSubdivisions == true ? this.locationsWithSubdivisions : this.locations;
  }

  getLocationDetails(countryCode: string): LocationDTO {
    if (!this.isLocationsLoaded) {
      this.loadLocationsFromFile();
      this.isLocationsLoaded = true;
    }

    // If requesting location details, we always want to include subdivision data
    const requestedLocation = this.locationsWithSubdivisions.find(element => element.countryISOCode === countryCode);

    if (requestedLocation === undefined) {
      throw new NotFoundException({ description: "Country code not found" });
    }

    return requestedLocation;
  }
}
