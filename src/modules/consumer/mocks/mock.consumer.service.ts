import { anyString, anything, mock, when } from "ts-mockito";
import { ConsumerService } from "../consumer.service";

export function getMockConsumerServiceWithDefaults(): ConsumerService {
  const mockConsumerService: ConsumerService = mock(ConsumerService);

  when(mockConsumerService.getConsumer(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.findConsumerById(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.findConsumerByEmailOrPhone(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.getOrCreateConsumerConditionally(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.updateConsumer(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.addPaymentMethod(anything(), anything(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.removePaymentMethod(anything(), anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.updatePaymentMethod(anything(), anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.getCryptoWallet(anything(), anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.addOrUpdateCryptoWallet(anything(), anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.getPaymentMethodProvider(anyString(), anyString())).thenReject(
    new Error("Method not implemented!"),
  );
  when(mockConsumerService.getFiatPaymentStatus(anyString(), anything())).thenReject(
    new Error("Method not implemented!"),
  );
  when(mockConsumerService.requestPayment(anything(), anything())).thenReject(new Error("Method not implemented!"));

  when(mockConsumerService.sendOtpToPhone(anyString(), anyString(), anyString())).thenReject(
    new Error("Method not implemented!"),
  );
  when(mockConsumerService.updateConsumerPhone(anything(), anything(), anyString())).thenReject(
    new Error("Method not implemented!"),
  );

  when(mockConsumerService.sendOtpToEmail(anyString(), anything(), anyString())).thenReject(
    new Error("Method not implemented!"),
  );
  when(mockConsumerService.updateConsumerEmail(anything(), anything())).thenReject(
    new Error("Method not implemented!"),
  );

  return mockConsumerService;
}
