import { anyString, anything, mock, when } from "ts-mockito";
import { TemplateProcessor } from "../utils/template.processor";

export function getMockTemplateProcessorWithDefaults(): TemplateProcessor {
  const mockTemplateProcessor = mock(TemplateProcessor);
  when(mockTemplateProcessor.addFormat(anything())).thenReject(new Error("Method not implemented"));
  when(mockTemplateProcessor.addLocale(anything())).thenReject(new Error("Method not implemented"));
  when(mockTemplateProcessor.loadTemplates()).thenReject(new Error("Method not implemented"));
  when(mockTemplateProcessor.populateTemplate(anything(), anything())).thenReject(new Error("Method not implemented"));
  when(mockTemplateProcessor.destroy()).thenReject(new Error("Method not implemented"));

  return mockTemplateProcessor;
}
