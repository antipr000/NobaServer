import { anything, mock, when } from "ts-mockito";
import { AlertService } from "../alerts/alert.service";

export const getMockAlertServiceWithDefaults = () => {
  const mockAlertService: AlertService = mock(AlertService);

  when(mockAlertService.raiseAlert(anything())).thenReject(new Error("Not implemented!"));

  return mockAlertService;
};
