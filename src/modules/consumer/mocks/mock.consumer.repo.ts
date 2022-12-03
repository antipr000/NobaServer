import { anyString, anything, mock, when } from "ts-mockito";
import { MongoDBConsumerRepo } from "../repos/MongoDBConsumerRepo";
import { IConsumerRepo } from "../repos/ConsumerRepo";

export function getMockConsumerRepoWithDefaults(): IConsumerRepo {
  const mockConsumerRepo: IConsumerRepo = mock(MongoDBConsumerRepo);

  when(mockConsumerRepo.createConsumer(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.exists(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getConsumer(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getConsumerByEmail(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getConsumerByPhone(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.updateConsumer(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.getAllConsumersForPartner(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.isHandleTaken(anyString())).thenReject(new Error("Method not implemented"));
  when(mockConsumerRepo.updateConsumerCircleWalletID(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );

  return mockConsumerRepo;
}
