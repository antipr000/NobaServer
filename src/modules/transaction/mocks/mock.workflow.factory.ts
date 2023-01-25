import { anyString, mock, when } from "ts-mockito";
import { WorkflowFactory } from "../factory/workflow.factory";

export function getMockWorkflowFactoryWithDefaults(): WorkflowFactory {
  const factory = mock(WorkflowFactory);
  when(factory.getWorkflowImplementation(anyString())).thenThrow(new Error("Not implemented!"));
  return factory;
}
