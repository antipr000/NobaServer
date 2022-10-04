import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { KmsKeyType } from "../../config/configtypes/KmsConfigs";
import { Result } from "../../core/logic/Result";
import { IOTPRepo } from "../auth/repo/OTPRepo";
import { CheckoutService } from "../common/checkout.service";
import { AddPaymentMethodResponse } from "../common/domain/AddPaymentMethodResponse";
import { EmailService } from "../common/email.service";
import { KmsService } from "../common/kms.service";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { Transaction } from "../transactions/domain/Transaction";
import { CardFailureExceptionText } from "./CardProcessingException";
import { Consumer, ConsumerProps } from "./domain/Consumer";
import { CryptoWallet } from "./domain/CryptoWallet";
import { PaymentMethod } from "./domain/PaymentMethod";
import { PaymentProviders } from "./domain/PaymentProviderDetails";
import { FiatTransactionStatus, PaymentRequestResponse } from "./domain/Types";
import { UserVerificationStatus } from "./domain/UserVerificationStatus";
import { PaymentMethodStatus, WalletStatus } from "./domain/VerificationStatus";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import { IConsumerRepo } from "./repos/ConsumerRepo";

@Injectable()
export class ConsumerService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("ConsumerRepo")
  private readonly consumerRepo: IConsumerRepo;

  @Inject()
  private readonly emailService: EmailService;

  @Inject()
  private readonly kmsService: KmsService;

  @Inject()
  private readonly checkoutService: CheckoutService;

  @Inject()
  private readonly sanctionedCryptoWalletService: SanctionedCryptoWalletService;

  @Inject("OTPRepo")
  private readonly otpRepo: IOTPRepo;

  async getConsumer(consumerID: string): Promise<Consumer> {
    return this.consumerRepo.getConsumer(consumerID);
  }

  async createConsumerIfFirstTimeLogin(
    emailOrPhone: string,
    partnerID: string,
    partnerUserID?: string,
  ): Promise<Consumer> {
    const isEmail = emailOrPhone.includes("@");
    const email = isEmail ? emailOrPhone : null;
    const phone = !isEmail ? emailOrPhone : null;

    const consumerResult = await this.findConsumerByEmailOrPhone(emailOrPhone);
    if (consumerResult.isFailure) {
      const newConsumer = Consumer.createConsumer({
        email: email.toLowerCase(),
        displayEmail: email,
        phone,
        partners: [
          {
            partnerID: partnerID,
            partnerUserID: partnerUserID,
          },
        ],
      });
      const result = await this.consumerRepo.createConsumer(newConsumer);
      await this.emailService.sendWelcomeMessage(emailOrPhone, result.props.firstName, result.props.lastName);
      return result;
    } else if (
      consumerResult.getValue().props.partners.filter(partner => partner.partnerID === partnerID).length === 0
    ) {
      return this.updateConsumer({
        ...consumerResult.getValue().props,
        partners: [
          ...consumerResult.getValue().props.partners,
          {
            partnerID: partnerID,
            partnerUserID: partnerUserID,
          },
        ],
      });
    }

    return consumerResult.getValue();
  }

  async updateConsumer(consumerProps: Partial<ConsumerProps>): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerProps._id);
    const updatedConsumer = await this.consumerRepo.updateConsumer(
      Consumer.createConsumer({
        ...consumer.props,
        ...consumerProps,
      }),
    );
    return updatedConsumer;
  }

  async findConsumerByEmailOrPhone(emailOrPhone: string): Promise<Result<Consumer>> {
    const isEmail = emailOrPhone.includes("@");
    const consumerResult = isEmail
      ? await this.consumerRepo.getConsumerByEmail(emailOrPhone.toLowerCase())
      : await this.consumerRepo.getConsumerByPhone(emailOrPhone);
    return consumerResult;
  }

  async findConsumerById(consumerId: string): Promise<Consumer> {
    return this.consumerRepo.getConsumer(consumerId);
  }

  async addPaymentMethod(consumer: Consumer, paymentMethod: AddPaymentMethodDTO): Promise<Consumer> {
    const addPaymentMethodResponse: AddPaymentMethodResponse = await this.checkoutService.addPaymentMethod(
      consumer,
      paymentMethod,
    );

    if (addPaymentMethodResponse.updatedConsumerData) {
      const result = await this.updateConsumer(addPaymentMethodResponse.updatedConsumerData);

      if (addPaymentMethodResponse.checkoutResponseData.paymentMethodStatus === PaymentMethodStatus.UNSUPPORTED) {
        // Do we want to send a different email here too? Currently just throw up to the UI as a 400.
        // Note that we are intentionally saving the payment method with this UNSUPPORTED status as
        // we may want to let the user know some day when their bank allows crypto.
        throw new BadRequestException(CardFailureExceptionText.NO_CRYPTO);
      }

      await this.emailService.sendCardAddedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.displayEmail,
        addPaymentMethodResponse.newPaymentMethod.cardType,
        addPaymentMethodResponse.newPaymentMethod.last4Digits,
      );
      return result;
    }
  }

  async requestPayment(consumer: Consumer, transaction: Transaction): Promise<PaymentRequestResponse> {
    // TODO: Check BIN list here
    /*
    let response: CheckoutResponseData;
    // Before calling checkout, check against our BIN list
    const validity = await this.creditCardService.isBINSupported(paymentMethod.cardNumber);
    if (validity == BINValidity.NOT_SUPPORTED) {
      // Bypass checkout call entirely
      throw new BadRequestException(CardFailureExceptionText.NO_CRYPTO);
    }
    */

    const paymentProvider = await this.getPaymentMethodProvider(consumer.props._id, transaction.props.paymentMethodID);
    if (paymentProvider === PaymentProviders.CHECKOUT) {
      return this.checkoutService.requestCheckoutPayment(consumer, transaction);
    } else {
      this.logger.error(
        `Error in making payment as payment provider ${paymentProvider} is not supported. Consumer: ${JSON.stringify(
          consumer,
        )}, Transaction: ${JSON.stringify(transaction)}`,
      );
      throw new BadRequestException(`Payment provider ${paymentProvider} is not supported`);
    }
  }

  async removePaymentMethod(consumer: Consumer, paymentToken: string): Promise<Consumer> {
    const paymentMethod = consumer.props.paymentMethods.filter(
      paymentMethod => paymentMethod.paymentToken === paymentToken,
    );
    if (paymentMethod.length === 0) {
      throw new NotFoundException("Payment Method id not found");
    }

    const paymentProviderID = paymentMethod[0].paymentProviderID;

    if (paymentProviderID === PaymentProviders.CHECKOUT) {
      await this.checkoutService.removePaymentMethod(paymentToken);
    } else {
      throw new NotFoundException("Payment provider not found");
    }

    const filteredPaymentMethods = consumer.props.paymentMethods.filter(
      paymentMethod => paymentMethod.paymentToken !== paymentToken,
    );

    const updatedConsumer: ConsumerProps = {
      ...consumer.props,
      paymentMethods: filteredPaymentMethods,
    };

    const result = await this.updateConsumer(updatedConsumer);

    await this.emailService.sendCardDeletedEmail(
      consumer.props.firstName,
      consumer.props.lastName,
      consumer.props.displayEmail,
      paymentMethod[0].cardType,
      paymentMethod[0].last4Digits,
    );
    return result;
  }

  async getFiatPaymentStatus(paymentId: string, paymentProvider: PaymentProviders): Promise<FiatTransactionStatus> {
    if (paymentProvider === PaymentProviders.CHECKOUT) {
      return this.checkoutService.getFiatPaymentStatus(paymentId);
    } else {
      throw new BadRequestException("Payment provider is not supported");
    }
  }

  async getPaymentMethodProvider(consumerId: string, paymentToken: string): Promise<PaymentProviders> {
    const consumer = await this.getConsumer(consumerId);
    const paymentMethod = consumer.props.paymentMethods.filter(
      paymentMethod => paymentMethod.paymentToken === paymentToken,
    );
    if (paymentMethod.length === 0) {
      throw new NotFoundException(`Payment method with token ${paymentToken} not found for consumer: ${consumerId}`);
    }

    return paymentMethod[0].paymentProviderID as PaymentProviders;
  }

  async updatePaymentMethod(consumerID: string, paymentMethod: PaymentMethod): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerID);
    const otherPaymentMethods = consumer.props.paymentMethods.filter(
      existingPaymentMethod => existingPaymentMethod.paymentToken !== paymentMethod.paymentToken,
    );

    const currentPaymentMethod = consumer.props.paymentMethods.filter(
      existingPaymentMethod => existingPaymentMethod.paymentToken === paymentMethod.paymentToken,
    );

    if (currentPaymentMethod.length === 0) {
      throw new BadRequestException(
        `Payment method with token ${paymentMethod.paymentToken} does not exist for consumer`,
      );
    }

    return await this.updateConsumer({
      ...consumer.props,
      paymentMethods: [...otherPaymentMethods, paymentMethod],
    });
  }

  async sendWalletVerificationOTP(consumer: Consumer, walletAddress: string) {
    const otp: number = Math.floor(100000 + Math.random() * 900000);
    await this.otpRepo.deleteAllOTPsForUser(consumer.props.email, "CONSUMER");
    await this.otpRepo.saveOTP(consumer.props.email, otp, "CONSUMER");
    await this.emailService.sendWalletUpdateVerificationCode(
      consumer.props.email,
      otp.toString(),
      walletAddress,
      consumer.props.firstName,
    );
  }

  async confirmWalletUpdateOTP(consumer: Consumer, walletAddress: string, otp: number) {
    // Verify if the otp is correct
    const actualOtp = await this.otpRepo.getOTP(consumer.props.email, "CONSUMER");
    const currentDateTime: number = new Date().getTime();

    if (actualOtp.props.otp !== otp || currentDateTime > actualOtp.props.otpExpiryTime) {
      // If otp doesn't match or if it is expired then raise unauthorized exception
      throw new UnauthorizedException();
    } else {
      // Just delete the OTP and proceed further
      await this.otpRepo.deleteOTP(actualOtp.props._id); // Delete the OTP
    }

    // Find the wallet and mark it verified
    const cryptoWallet: CryptoWallet = consumer.props.cryptoWallets.filter(
      existingCryptoWallet => existingCryptoWallet.address == walletAddress,
    )[0];

    const isSanctionedWallet = await this.sanctionedCryptoWalletService.isWalletSanctioned(cryptoWallet.address);
    if (isSanctionedWallet) {
      // Flag the wallet if it is a sanctioned wallet address.
      cryptoWallet.status = WalletStatus.FLAGGED;
      this.logger.error(
        `Failed to add a sanctioned wallet: ${cryptoWallet.address} for consumer: ${consumer.props._id}`,
      );
      await this.addOrUpdateCryptoWallet(consumer, cryptoWallet);
      throw new BadRequestException({ message: "Failed to add wallet: sanctioned wallet" });
    }
    cryptoWallet.status = WalletStatus.APPROVED;

    return await this.addOrUpdateCryptoWallet(consumer, cryptoWallet);
  }

  getCryptoWallet(consumer: Consumer, address: string): CryptoWallet {
    const cryptoWallets = consumer.props.cryptoWallets.filter(wallet => wallet.address === address);

    if (cryptoWallets.length === 0) {
      return null;
    }

    return cryptoWallets[0];
  }

  async addOrUpdateCryptoWallet(consumer: Consumer, cryptoWallet: CryptoWallet): Promise<Consumer> {
    const otherCryptoWallets = consumer.props.cryptoWallets.filter(
      existingCryptoWallet => existingCryptoWallet.address !== cryptoWallet.address,
    );

    const selectedCryptoWallet = consumer.props.cryptoWallets.filter(
      existingCryptoWallet => existingCryptoWallet.address === cryptoWallet.address,
    );

    if (selectedCryptoWallet.length !== 0) {
      const wallet = selectedCryptoWallet[0];
      if (
        wallet.address !== cryptoWallet.address ||
        wallet.chainType !== cryptoWallet.chainType ||
        wallet.partnerID !== cryptoWallet.partnerID
      ) {
        throw new BadRequestException("Cannot update address, chainType and partnerID for an already existing wallet");
      }
    }

    // Send the verification OTP to the user
    if (cryptoWallet.status == WalletStatus.PENDING) {
      await this.sendWalletVerificationOTP(consumer, cryptoWallet.address);
    }

    const updatedConsumer = await this.updateConsumer({
      ...consumer.props,
      cryptoWallets: [...otherCryptoWallets, cryptoWallet],
    });
    return updatedConsumer;
  }

  async removeCryptoWallet(consumer: Consumer, cryptoWalletAddress: string): Promise<Consumer> {
    const otherCryptoWallets = consumer.props.cryptoWallets.filter(
      existingCryptoWallet => existingCryptoWallet.address !== cryptoWalletAddress,
    );

    const updatedConsumer = await this.updateConsumer({
      ...consumer.props,
      cryptoWallets: [...otherCryptoWallets],
    });
    return updatedConsumer;
  }

  // Be VERY cautious about using this. We should only need it to send to ZeroHash.
  async getDecryptedSSN(consumer: ConsumerProps) {
    return await this.kmsService.decryptString(consumer.socialSecurityNumber, KmsKeyType.SSN);
  }

  async addZeroHashParticipantCode(consumerID: string, zeroHashParticipantCode: string): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerID);

    return await this.updateConsumer({
      ...consumer.props,
      zhParticipantCode: zeroHashParticipantCode,
    });
  }

  getVerificationStatus(consumer: Consumer): UserVerificationStatus {
    // TODO: Write logic for verification status based on current modifications of users verification data
    throw new Error("Method not implemented");
  }
}
