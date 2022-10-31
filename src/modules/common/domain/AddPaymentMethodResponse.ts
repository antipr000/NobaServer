import { PaymentMethod } from "../../../modules/consumer/domain/PaymentMethod";
import { ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { CheckoutResponseData } from "./CheckoutResponseData";

export type AddCreditCardPaymentMethodResponse = {
  updatedConsumerData?: ConsumerProps;
  checkoutResponseData: CheckoutResponseData;
  newPaymentMethod?: PaymentMethod;
};

export type AddInstrumentRequest = {
  checkoutCustomerID: string;
  checkoutToken: string;
};
