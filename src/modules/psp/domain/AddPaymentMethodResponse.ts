import { PaymentMethod } from "../../consumer/domain/PaymentMethod";
import { ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { CheckoutResponseData } from "../../common/domain/CheckoutResponseData";

export type AddPaymentMethodResponse = {
  updatedConsumerData?: ConsumerProps;
  checkoutResponseData: CheckoutResponseData;
  newPaymentMethod?: PaymentMethod;
};
