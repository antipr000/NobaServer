import { anyString, anything, mock, when } from "ts-mockito";
import { PomeloClient } from "../pomelo.client";

export function getMockPomeloClientWithDefaults(): PomeloClient {
  const mockPomeloClient = mock(PomeloClient);

  when(mockPomeloClient.createUser(anyString(), anything())).thenReject(new Error("Not implemented"));
  when(mockPomeloClient.createCard(anyString(), anything())).thenReject(new Error("Not implemented"));

  return mockPomeloClient;
}
