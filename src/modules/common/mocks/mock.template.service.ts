import { anyString, anything, mock, when } from "ts-mockito";
import { TemplateService } from "../template.service";

export function getMockTemplateServiceWithDefaults(): TemplateService {
  const mockTemplateService = mock(TemplateService);
  when(mockTemplateService.getHandlebarLanguageTemplate(anyString())).thenReject(new Error("Method not implemented"));
  when(mockTemplateService.pushHandlebarLanguageFile(anyString(), anyString(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  return mockTemplateService;
}
