import { anyString, anything, mock, when } from "ts-mockito";
import { EmployerService } from "../employer.service";

export function getMockEmployerServiceWithDefaults(): EmployerService {
  const mockEmployerService: EmployerService = mock(EmployerService);

  when(mockEmployerService.createEmployer(anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.updateEmployer(anyString(), anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockEmployerService.getEmployerByID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.getEmployerByBubbleID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.getEmployerByReferralID(anyString())).thenReject(new Error("Method not implemented"));

  return mockEmployerService;
}
