import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { ConsumerService } from "../consumer.service";

export function getMockConsumerServiceWithDefaults(): ConsumerService {
  const mockConsumerService: ConsumerService = mock(ConsumerService);

  when(mockConsumerService.getConsumer(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.findConsumerById(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.findConsumerByEmailOrPhone(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.createConsumerIfFirstTimeLogin(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.updateConsumer(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.addCheckoutPaymentMethod(anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.removePaymentMethod(anything(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.updatePaymentMethod(anything(), anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.addOrUpdateCryptoWallet(anyString(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.requestCheckoutPayment(anyString(), anyNumber(), anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );

  return mockConsumerService;
}
