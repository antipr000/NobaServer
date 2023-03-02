import { anything, mock, when } from "ts-mockito";
import { ConsumerMapper } from "../mappers/ConsumerMapper";

export function getMockConsumerMapperWithDefaults(): ConsumerMapper {
  const mockConsumerMapper: ConsumerMapper = mock(ConsumerMapper);

  when(mockConsumerMapper.toDTO(anything(), anything(), anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerMapper.toDomain(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerMapper.toCryptoWalletsDTO(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerMapper.toLinkedEmployerArrayDTO(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerMapper.toLinkedEmployerDTO(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerMapper.toPaymentMethodsDTO(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerMapper.toSimpleDTO(anything())).thenReject(new Error("Method not implemented"));
  when(mockConsumerMapper.toConsumerInternalDTO(anything())).thenReject(new Error("Method not implemented"));

  return mockConsumerMapper;
}
