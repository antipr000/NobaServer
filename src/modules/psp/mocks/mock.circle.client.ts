import { anyString, anything, mock, when } from "ts-mockito";
import { CircleClient } from "../circle.client";

export function getMockCircleClientWithDefaults(): CircleClient {
  const circleClient = mock(CircleClient);

  when(circleClient.createWallet(anyString())).thenReject(new Error("Not implemented!"));
  when(circleClient.getWalletBalance(anyString())).thenReject(new Error("Not implemented!"));
  when(circleClient.withdraw(anything())).thenReject(new Error("Not implemented!"));

  return circleClient;
}