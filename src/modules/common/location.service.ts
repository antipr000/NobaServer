import { Injectable, NotFoundException } from "@nestjs/common";
import { readFileSync } from "fs";
import * as path from "path";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { LocationDTO, SubdivisionDTO } from "./dto/LocationDTO";
import { ZEROHASH_COUNTRY_MAPPING, EXCLUDED_COUNTRY_CODES } from "./SupportedLocations";
import { getPropertyFromEnvironment, MASTER_CONFIG_DIRECTORY } from "../../config/ConfigurationUtils";

@Injectable()
export class LocationService {
  private static LOCATION_DATA_FILENAME = "countries+states.json";

  /*
    Locations stores the locations without subdivisions and locationsWithSubdivisions includes subdivisions.
    Even though this results in duplication of data, it is more efficient than simply storing once with subdivisions
    and excluding subdivisions at runtime if requested to not include them.
  */
  private locations: Map<string, LocationDTO>;
  private locationsWithSubdivisions: Map<string, LocationDTO>;
  private isLocationsLoaded: boolean;

  constructor(private readonly configService: CustomConfigService) {
    this.isLocationsLoaded = false;
  }

  private loadLocationsFromFile() {
    const results = new Map<string, LocationDTO>();
    const resultsWithSubdivisions = new Map<string, LocationDTO>();

    let locationDataRaw = readFileSync(
      path.resolve(getPropertyFromEnvironment(MASTER_CONFIG_DIRECTORY), LocationService.LOCATION_DATA_FILENAME),
      "utf-8",
    );

    const locationData = JSON.parse(locationDataRaw);

    locationData.forEach(element => {
      // Skip excluded countries
      if (EXCLUDED_COUNTRY_CODES.indexOf(element.iso2) == -1) {
        // Skip any countries not mapped to Zerohash country names
        const zhCountryName: string = ZEROHASH_COUNTRY_MAPPING[element.iso2];
        if (zhCountryName != undefined) {
          // Get subdivision data
          const subdivisions = new Map<string, SubdivisionDTO>();
          element.states.forEach(subdivision => {
            subdivisions[subdivision.state_code] = { name: subdivision.name, code: subdivision.state_code };
          });

          // Store with subdivision data
          resultsWithSubdivisions[element.iso2] = {
            countryName: element.name,
            countryISOCode: element.iso2,
            subdivisions: subdivisions,
            alternateCountryName: zhCountryName,
          };

          // Store without subdivision data
          results[element.iso2] = {
            countryName: element.name,
            countryISOCode: element.iso2,
            alternateCountryName: zhCountryName,
          };
        }
      }
    });

    this.locations = results;
    this.locationsWithSubdivisions = resultsWithSubdivisions;
  }

  getLocations(includeSubdivisions: boolean): Map<string, LocationDTO> {
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
    const requestedLocation = this.locationsWithSubdivisions[countryCode];
    if (requestedLocation === undefined) {
      throw new NotFoundException({ description: "Country code not found" });
    }

    return requestedLocation;
  }
}
