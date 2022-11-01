import { CreditCardDTO } from "../../../modules/common/dto/CreditCardDTO";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { PspCardPaymentResponse } from "./PspPaymentResponse";

export type HandlePaymentResponse = {
  consumer: Consumer;
  paymentResponse: PspCardPaymentResponse;
  instrumentID: string;
  cardNumber: string;
  sessionID: string;
  transactionID: string;
  partnerID: string;
  binData: CreditCardDTO;
};
