import { anything, mock, when } from "ts-mockito";
import { BubbleClient } from "../dashboard/bubble.client";

export function getMockDashboardClientWithDefaults() {
  const dashboardClient = mock(BubbleClient);
  when(dashboardClient.registerNewEmployee(anything())).thenReject(new Error("Not implemented"));
  when(dashboardClient.updateEmployeeAllocationAmount(anything(), anything())).thenReject(new Error("Not implemented"));
  return dashboardClient;
}
