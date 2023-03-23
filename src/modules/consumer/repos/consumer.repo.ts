import { Result } from "../../../core/logic/Result";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { ContactInfo } from "../domain/ContactInfo";
import { CryptoWallet, CryptoWalletProps } from "../domain/CryptoWallet";
import { Identification, IdentificationCreateRequest, IdentificationUpdateRequest } from "../domain/Identification";
import { PaymentMethod, PaymentMethodProps } from "../domain/PaymentMethod";
import { FindConsumerByStructuredFieldsDTO } from "../dto/consumer.search.dto";

export interface IConsumerRepo {
  getConsumer(consumerID: string): Promise<Consumer>;
  getConsumerByHandle(handle: string): Promise<Consumer>;
  createConsumer(consumer: Consumer): Promise<Consumer>;
  exists(emailOrPhone: string): Promise<boolean>;
  findConsumersByPublicInfo(publicInfoSearch: string, limit: number): Promise<Result<Consumer[]>>;
  findConsumerByContactInfo(contactInfo: ContactInfo): Promise<Result<Consumer>>;
  findConsumersByStructuredFields(filter: FindConsumerByStructuredFieldsDTO): Promise<Result<Consumer[]>>;
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
  addIdentification(identification: IdentificationCreateRequest): Promise<Identification>;
  getAllIdentificationsForConsumer(consumerID: string): Promise<Identification[]>;
  getIdentificationForConsumer(consumerID: string, type: string, countryCode: string): Promise<Identification>;
  updateIdentification(id: string, identification: IdentificationUpdateRequest): Promise<Identification>;
  deleteIdentification(id: string): Promise<void>;
}
