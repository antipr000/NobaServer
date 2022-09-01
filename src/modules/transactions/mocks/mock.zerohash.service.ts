import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { ZeroHashService } from "../zerohash.service";

export function getMockZerohashServiceWithDefaults(): ZeroHashService {
  const mockZerohashService = mock(ZeroHashService);

  when(mockZerohashService.createParticipant(anything(), anything())).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.estimateNetworkFee(anything(), anything())).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.executeQuote(anything())).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.getAccounts()).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.getAllParticipants()).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.getParticipant(anyString())).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.getPrice(anything(), anything())).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.getWithdrawal(anything())).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.makeRequest(anything(), anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockZerohashService.requestTrade(anything())).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.requestQuoteForFixedFiatCurrency(anyString(), anyString(), anyNumber())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockZerohashService.requestQuoteForDesiredCryptoQuantity(anyString(), anyString(), anyNumber())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockZerohashService.transferAssetsToNoba(anyString(), anyNumber())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockZerohashService.executeTrade(anything())).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.getTransfer(anything())).thenReject(new Error("Method not implemented"));
  when(
    mockZerohashService.requestWithdrawal(anyString(), anyNumber(), anyString(), anyString(), anyString()),
  ).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.checkTradeStatus(anything())).thenReject(new Error("Method not implemented"));
  return mockZerohashService;
}
