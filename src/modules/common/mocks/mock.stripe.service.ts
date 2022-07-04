import { mock, when } from "ts-mockito";
import { StripeService } from "../stripe.service";
import Stripe from "stripe";

export function getMockStripeServiceWithDefaults(): StripeService {
  const mockStripeService = mock(StripeService);

  const mockStripeApi = mock(Stripe);

  when(mockStripeService.stripeApi).thenReturn(mockStripeApi);
  return mockStripeService;
}
