import { anyString, anything, mock, when } from "ts-mockito";
import { LocationService } from "../location.service";

export const getMockLocationServiceWithDefaults = () => {
  const mockLocationService: LocationService = mock(LocationService);

  when(mockLocationService.getLocationDetails(anyString())).thenReject(new Error("Not implemented!"));
  when(mockLocationService.getLocations(anything())).thenReject(new Error("Not implemented!"));

  return mockLocationService;
};
