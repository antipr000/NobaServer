import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { ConsumerService } from "../consumer.service";

export function getMockConsumerServiceWithDefaults(): ConsumerService {
  const mockConsumerService: ConsumerService = mock(ConsumerService);

  when(mockConsumerService.getConsumer(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.findConsumersByPublicInfo(anyString(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.findConsumersByContactInfo(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.findConsumerIDByHandle(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.findConsumerIDByReferralCode(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.findConsumerByEmailOrPhone(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.getActiveConsumer(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.getOrCreateConsumerConditionally(anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.updateConsumer(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.updatePaymentMethod(anything(), anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.subscribeToPushNotifications(anything(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.unsubscribeFromPushNotifications(anything(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.getCryptoWallet(anything(), anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerService.addOrUpdateCryptoWallet(anything(), anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerService.getPaymentMethodProvider(anyString(), anyString())).thenReject(
    new Error("Method not implemented!"),
  );
  when(mockConsumerService.requestPayment(anything(), anything())).thenReject(new Error("Method not implemented!"));

  when(mockConsumerService.sendOtpToPhone(anyString(), anyString())).thenReject(new Error("Method not implemented!"));
  when(mockConsumerService.updateConsumerPhone(anything(), anything())).thenReject(
    new Error("Method not implemented!"),
  );

  when(mockConsumerService.sendOtpToEmail(anyString(), anything())).thenReject(new Error("Method not implemented!"));
  when(mockConsumerService.updateConsumerEmail(anything(), anything())).thenReject(
    new Error("Method not implemented!"),
  );
  when(mockConsumerService.getBase64EncodedQRCode(anyString())).thenReject(new Error("Method not implemented!"));
  when(mockConsumerService.registerWithAnEmployer(anyString(), anyString(), anyString(), anyNumber())).thenReject(
    new Error("Method not implemented!"),
  );
  when(mockConsumerService.listLinkedEmployers(anyString())).thenReject(new Error("Method not implemented!"));
  when(
    mockConsumerService.updateEmployerAllocationAmount(anyString(), anyString(), anyString(), anyNumber()),
  ).thenReject(new Error("Method not implemented!"));

  return mockConsumerService;
}
