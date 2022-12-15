import { anyString, anything, mock, when } from "ts-mockito";
import { IConsumerRepo } from "../repos/ConsumerRepo";
import { SQLConsumerRepo } from "../repos/SQLConsumerRepo";

export function getMockConsumerRepoWithDefaults(): IConsumerRepo {
  const mockConsumerRepo: IConsumerRepo = mock(SQLConsumerRepo);

  when(mockConsumerRepo.createConsumer(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.exists(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getConsumer(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getConsumerByEmail(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getConsumerByPhone(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.updateConsumer(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.isHandleTaken(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.addCryptoWallet(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.updateCryptoWallet(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getAllCryptoWalletsForConsumer(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getCryptoWalletForConsumer(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerRepo.addPaymentMethod(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getAllPaymentMethodsForConsumer(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getPaymentMethodForConsumer(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockConsumerRepo.updatePaymentMethod(anyString(), anything())).thenReject(new Error("Method not implemented"));
  return mockConsumerRepo;
}
