import { anyString, anything, mock, when } from "ts-mockito";
import { PaymentService } from "../payment.service";

export function getMockPaymentServiceWithDefaults(): PaymentService {
  const paymentService = mock(PaymentService);

  when(paymentService.getBalance(anything(), anyString())).thenReject(new Error("Not implemented!"));

  return paymentService;
}
