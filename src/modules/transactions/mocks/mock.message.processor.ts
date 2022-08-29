import { anyString, when, mock, anything } from "ts-mockito";
import { FiatTransactionInitiator } from "../queueprocessors/FiatTransactionInitiator";

export function getMockMessageProcessorWithDefaults() {
  const messageProcessor = mock(FiatTransactionInitiator);

  when(messageProcessor.processMessage(anyString())).thenReject(new Error("Not implemented!"));
  when(messageProcessor.processMessageInternal(anyString())).thenReject(new Error("Not implemented!"));
  when(messageProcessor.processingErrorHandler(anything())).thenReject(new Error("Not implemented!"));
  when(messageProcessor.subscriptionErrorHandler(anything())).thenReject(new Error("Not implemented!"));
  return messageProcessor;
}
