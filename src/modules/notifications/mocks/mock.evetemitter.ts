import { EventEmitter2 } from "@nestjs/event-emitter";
import { anyString, anything, mock, when } from "ts-mockito";

export function getMockEventEmitterWithDefaults(): EventEmitter2 {
  const eventEmitter = mock(EventEmitter2);

  when(eventEmitter.emitAsync(anyString(), anything())).thenReject(new Error("Method not implemented!"));
  return eventEmitter;
}
