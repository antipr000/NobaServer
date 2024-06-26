import { anything, mock, when } from "ts-mockito";
import { PlaidClient } from "../plaid.client";

export function getMockPlaidClientWithDefaults(): PlaidClient {
  const plaidClient = mock(PlaidClient);

  when(plaidClient.generateLinkToken(anything())).thenReject(new Error("Not implemented!"));
  when(plaidClient.createProcessorToken(anything())).thenReject(new Error("Not implemented!"));
  when(plaidClient.exchangeForAccessToken(anything())).thenReject(new Error("Not implemented!"));
  when(plaidClient.retrieveAccountData(anything())).thenReject(new Error("Not implemented!"));

  return plaidClient;
}
