import { anyString, mock, when } from "ts-mockito";
import { CardService } from "../card.service";

export function getMockCardServiceWithDefaults(): CardService {
  const mockCardService = mock(CardService);

  when(mockCardService.createCard(anyString(), anyString())).thenReject(new Error("Not implemented!"));

  return mockCardService;
}
