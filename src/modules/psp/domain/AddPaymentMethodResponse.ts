import { PaymentMethod } from "../../consumer/domain/PaymentMethod";
import { ConsumerProps } from "../../consumer/domain/Consumer";
import { CheckoutResponseData } from "../../common/domain/CheckoutResponseData";

export type AddCreditCardPaymentMethodResponse = {
  updatedConsumerData?: ConsumerProps;
  checkoutResponseData: CheckoutResponseData;
  newPaymentMethod?: PaymentMethod;
};
