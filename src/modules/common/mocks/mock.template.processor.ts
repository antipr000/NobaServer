import { anyString, anything, mock, when } from "ts-mockito";
import { TemplateProcessor } from "../utils/template.processor";

export function getMockTemplateProcessorWithDefaults(): TemplateProcessor {
  const mockTemplateProcessor = mock(TemplateProcessor);
  when(mockTemplateProcessor.loadTemplates()).thenReject(new Error("Method not implemented"));
  when(mockTemplateProcessor.populateTemplate(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  return mockTemplateProcessor;
}
