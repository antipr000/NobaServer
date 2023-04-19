import { anyString, anything, mock, when } from "ts-mockito";
import { PomeloWorkflowMapper } from "../pomelo.workflow.mapper";

export function getMockPomeloWorkflowMapperWithDefaults(): PomeloWorkflowMapper {
  const mockPomeloWorkflowMapper = mock(PomeloWorkflowMapper);

  when(mockPomeloWorkflowMapper.mapToPomeloTransactionDTO(anything())).thenReject(new Error("Not implemented"));

  return mockPomeloWorkflowMapper;
}
