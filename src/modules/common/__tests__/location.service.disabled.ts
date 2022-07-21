import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { LocationService } from "../location.service";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";

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

      expect(Object.keys(locations).length).toEqual(205);

      // Pick one country and validate mappings
      const us = locations["US"];

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(us.subdivisions).toBeUndefined();
    });

    it("should obtain 205 countries with subdivisions", async () => {
      const locations = locationService.getLocations(true);

      expect(Object.keys(locations).length).toEqual(205);

      // Pick one country and validate mappings
      const us = locations["US"];

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(Object.keys(us.subdivisions).length).toBe(66);
      expect(us.subdivisions["WA"].code).toBe("WA");
      expect(us.subdivisions["WA"].name).toBe("Washington");
    });

    it("should return the deatils of a single country with subdivisions", async () => {
      const us = locationService.getLocationDetails("US");

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(Object.keys(us.subdivisions).length).toBe(66);
      expect(us.subdivisions["WA"].code).toBe("WA");
      expect(us.subdivisions["WA"].name).toBe("Washington");
    });
  });
});
