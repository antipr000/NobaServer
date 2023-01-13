import { Result } from "../../../core/logic/Result";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { ContactInfo } from "../domain/ContactInfo";
import { CryptoWallet, CryptoWalletProps } from "../domain/CryptoWallet";
import { PaymentMethod, PaymentMethodProps } from "../domain/PaymentMethod";

export interface IConsumerRepo {
  getConsumer(consumerID: string): Promise<Consumer>;
  createConsumer(consumer: Consumer): Promise<Consumer>;
  exists(emailOrPhone: string): Promise<boolean>;
  findConsumersByContactInfo(contactInfo: ContactInfo): Promise<Result<Consumer>>;
  getConsumerByEmail(email: string): Promise<Result<Consumer>>;
  getConsumerByPhone(phone: string): Promise<Result<Consumer>>;
  getConsumerIDByHandle(handle: string): Promise<string>;
  getConsumerIDByReferralCode(referralCode: string): Promise<string>;
  updateConsumer(consumerID: string, consumer: Partial<ConsumerProps>): Promise<Consumer>;
  isHandleTaken(handle: string): Promise<boolean>;
  addPaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod>;
  getPaymentMethodForConsumer(id: string, consumerID: string): Promise<PaymentMethod>;
  getAllPaymentMethodsForConsumer(consumerID: string): Promise<PaymentMethod[]>;
  updatePaymentMethod(id: string, paymentMethodProps: Partial<PaymentMethodProps>): Promise<PaymentMethod>;
  addCryptoWallet(cryptoWallet: CryptoWallet): Promise<CryptoWallet>;
  getCryptoWalletForConsumer(id: string, consumerID: string): Promise<CryptoWallet>;
  getAllCryptoWalletsForConsumer(consumerID: string): Promise<CryptoWallet[]>;
  updateCryptoWallet(id: string, cryptoWalletProps: Partial<CryptoWalletProps>): Promise<CryptoWallet>;
}
