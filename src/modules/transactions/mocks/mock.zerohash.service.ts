import { anyString, anything, mock, when } from "ts-mockito";
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
  when(mockZerohashService.getTrade(anything())).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.getWithdrawal(anything())).thenReject(new Error("Method not implemented"));
  when(mockZerohashService.makeRequest(anything(), anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockZerohashService.requestQuote(anyString(), anyString(), anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockZerohashService.requestTrade(anything())).thenReject(new Error("Method not implemented"));

  return mockZerohashService;
}
