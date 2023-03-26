import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { LocationService } from "../location.service";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { NotFoundException } from "@nestjs/common";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("LocationService", () => {
  let locationService: LocationService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
      LOCATION_DATA_FILE_PATH: __dirname.split("src")[0] + "/appconfigs/countries+states.json",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [LocationService],
    }).compile();

    locationService = app.get<LocationService>(LocationService);
  });

  describe("Location service tests", () => {
    it("should obtain 205 countries without subdivisions", async () => {
      const locations = locationService.getLocations(false);

      expect(locations.length).toEqual(205);

      // Pick one country and validate mappings
      const us = locations.find(element => element.countryISOCode === "US");

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(us.subdivisions).toBeUndefined();
      expect(us.dialingPrefix).toBe("1");
      expect(us.alpha3ISOCode).toBe("USA");
    });

    it("should obtain 205 countries with subdivisions", async () => {
      const locations = locationService.getLocations(true);

      expect(Object.keys(locations).length).toEqual(205);

      // Pick one country and validate mappings
      const us = locations.find(element => element.countryISOCode === "US");

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(Object.keys(us.subdivisions).length).toBe(52);
      const subdivision = us.subdivisions.find(subdivision => subdivision.code === "WA");
      expect(subdivision.code).toBe("WA");
      expect(subdivision.name).toBe("Washington");
    });

    it("should return the details of a single country with subdivisions", async () => {
      const us = locationService.getLocationDetails("US");

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(Object.keys(us.subdivisions).length).toBe(52);
      const subdivision = us.subdivisions.find(subdivision => subdivision.code === "WA");
      expect(subdivision.code).toBe("WA");
      expect(subdivision.name).toBe("Washington");
    });

    it("should throw NotFoundException if the country code doesn't exist", async () => {
      expect(async () => {
        await locationService.getLocationDetails("XX");
      }).rejects.toThrow(NotFoundException);
    });
  });
});
