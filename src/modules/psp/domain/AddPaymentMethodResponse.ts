import { PaymentMethod } from "../../consumer/domain/PaymentMethod";
import { Consumer as ConsumerProps } from "../../../generated/domain/consumer";
import { CheckoutResponseData } from "../../common/domain/CheckoutResponseData";

export type AddPaymentMethodResponse = {
  updatedConsumerData?: ConsumerProps;
  checkoutResponseData: CheckoutResponseData;
  newPaymentMethod?: PaymentMethod;
};
