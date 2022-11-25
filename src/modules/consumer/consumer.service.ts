import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { KmsKeyType } from "../../config/configtypes/KmsConfigs";
import { Result } from "../../core/logic/Result";
import { IOTPRepo } from "../auth/repo/OTPRepo";
import { PaymentService } from "../psp/payment.service";
import { AddPaymentMethodResponse } from "../psp/domain/AddPaymentMethodResponse";
import { KmsService } from "../common/kms.service";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { Partner } from "../partner/domain/Partner";
import { PartnerService } from "../partner/partner.service";
import { Transaction } from "../transactions/domain/Transaction";
import { CardFailureExceptionText } from "./CardProcessingException";
import { Consumer, ConsumerProps } from "./domain/Consumer";
import { CryptoWallet } from "./domain/CryptoWallet";
import { PaymentMethod } from "./domain/PaymentMethod";
import { FiatTransactionStatus, PaymentRequestResponse } from "./domain/Types";
import { UserVerificationStatus } from "./domain/UserVerificationStatus";
import { PaymentMethodStatus, WalletStatus } from "./domain/VerificationStatus";
import { AddPaymentMethodDTO, PaymentType } from "./dto/AddPaymentMethodDTO";
import { IConsumerRepo } from "./repos/ConsumerRepo";
import { NotificationService } from "../notifications/notification.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { PaymentProvider } from "./domain/PaymentProvider";
import { Utils } from "../../core/utils/Utils";
import { UserPhoneUpdateRequest } from "./dto/PhoneVerificationDTO";
import { consumerIdentityIdentifier } from "../auth/domain/IdentityType";
import { SMSService } from "../common/sms.service";
import { Otp } from "../auth/domain/Otp";
import { UserEmailUpdateRequest } from "./dto/EmailVerificationDTO";
import BadWordFilter from "bad-words-es";
import { STATIC_DEV_OTP } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

@Injectable()
export class ConsumerService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("ConsumerRepo")
  private readonly consumerRepo: IConsumerRepo;

  @Inject()
  private readonly notificationService: NotificationService;

  @Inject()
  private readonly kmsService: KmsService;

  @Inject()
  private readonly paymentService: PaymentService;

  @Inject()
  private readonly sanctionedCryptoWalletService: SanctionedCryptoWalletService;

  @Inject("OTPRepo")
  private readonly otpRepo: IOTPRepo;

  @Inject()
  private readonly partnerService: PartnerService;

  @Inject()
  private readonly smsService: SMSService;

  private otpOverride: number;

  constructor(private readonly configService: CustomConfigService) {
    this.otpOverride = this.configService.get(STATIC_DEV_OTP);
  }

  async getConsumer(consumerID: string): Promise<Consumer> {
    return this.consumerRepo.getConsumer(consumerID);
  }

  private analyseHandle(handle: string): void {
    // Only alpha-numeric characters and "_" (underscore) is allowed.
    const regex = new RegExp("^[a-z0-9][a-z0-9-]{2,14}$");
    if (handle.length < 3 || handle.length > 15) {
      throw new BadRequestException("'handle' should be between 3 and 15 charcters long.");
    }
    if (!regex.test(handle)) {
      throw new BadRequestException(
        "'handle' can't start with an '-' and can only contain alphanumeric characters & '-'.",
      );
    }

    const filter = new BadWordFilter({ placeHolder: "$" });
    const cleanedHandle = filter.clean(handle);
    if (cleanedHandle.indexOf("$") !== -1) {
      throw new BadRequestException("Specified 'handle' is reserved. Please choose a different one.");
    }
  }

  // Note that this depicts the current state & is not locking the handle
  // (like booking applications).
  // So, it may happen that the function returned 'true' but when called
  // 'updateConsumer' with the same 'handle', it throws BadRequestException.
  async isHandleAvailable(handle: string): Promise<boolean> {
    this.analyseHandle(handle);
    return (await this.consumerRepo.isHandleTaken(handle)) === false;
  }

  private generateOTP(): number {
    return this.otpOverride ?? Utils.generateOTP();
  }

  // get's consumer object if consumer already exists, otherwise creates a new consumer if createIfNotExists is true
  async getOrCreateConsumerConditionally(
    emailOrPhone: string,
    partnerID: string,
    partnerUserID?: string,
  ): Promise<Consumer> {
    const isEmail = Utils.isEmail(emailOrPhone);
    const email = isEmail ? emailOrPhone : null;
    const phone = !isEmail ? emailOrPhone : null;

    const consumerResult = await this.findConsumerByEmailOrPhone(emailOrPhone);
    if (consumerResult.isFailure) {
      const newConsumer = Consumer.createConsumer({
        email: email ? email.toLowerCase() : undefined,
        displayEmail: email ?? undefined,
        phone,
        partners: [
          {
            partnerID: partnerID,
            partnerUserID: partnerUserID,
          },
        ],
      });
      const result = await this.consumerRepo.createConsumer(newConsumer);
      if (isEmail) {
        await this.notificationService.sendNotification(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, partnerID, {
          email: emailOrPhone,
          firstName: result.props.firstName,
          lastName: result.props.lastName,
          nobaUserID: result.props._id,
        });
      }
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
    if (consumerProps.handle !== undefined && consumerProps.handle !== null) {
      this.analyseHandle(consumerProps.handle);
    }
    const updatedConsumer = await this.consumerRepo.updateConsumer(
      Consumer.createConsumer({
        ...consumer.props,
        ...consumerProps,
      }),
    );
    return updatedConsumer;
  }

  async sendOtpToPhone(phone: string) {
    const otp = this.generateOTP();
    await this.otpRepo.deleteAllOTPsForUser(phone, consumerIdentityIdentifier);
    await this.smsService.sendSMS(phone, `${otp} is your one-time password to verify your phone number with Noba.`);
    const otpObject = Otp.createOtp({
      emailOrPhone: Utils.stripSpaces(phone),
      identityType: consumerIdentityIdentifier,
      otp,
    });
    this.otpRepo.saveOTPObject(otpObject);
  }

  async updateConsumerPhone(consumer: Consumer, reqData: UserPhoneUpdateRequest): Promise<Consumer> {
    const otpResult = await this.otpRepo.getOTP(reqData.phone, consumerIdentityIdentifier);

    if (otpResult.props.otp !== reqData.otp) {
      throw new BadRequestException("OTP is incorrect");
    }

    const updatedConsumer = await this.updateConsumer({
      _id: consumer.props._id,
      phone: reqData.phone,
    });
    return updatedConsumer;
  }

  async sendOtpToEmail(email: string, consumer: Consumer, partnerID: string) {
    const otp = this.generateOTP();
    await this.otpRepo.deleteAllOTPsForUser(email, consumerIdentityIdentifier);
    await this.otpRepo.saveOTP(email, otp, consumerIdentityIdentifier);

    await this.notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, partnerID, {
      email: email,
      otp: otp.toString(),
      firstName: consumer.props.firstName ?? undefined,
    });
  }

  async updateConsumerEmail(consumer: Consumer, reqData: UserEmailUpdateRequest): Promise<Consumer> {
    const otpResult = await this.otpRepo.getOTP(reqData.email, consumerIdentityIdentifier);

    if (otpResult.props.otp !== reqData.otp) {
      throw new BadRequestException("OTP is incorrect");
    }

    const updatedConsumer = await this.updateConsumer({
      _id: consumer.props._id,
      email: reqData.email.toLowerCase(),
      displayEmail: reqData.email,
    });

    if (!consumer.props.email) {
      //email being added for the first time
      this.logger.info(`User email updated for first time sending welcome note, userId: ${consumer.props._id}`);
      await this.notificationService.sendNotification(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, undefined, {
        email: updatedConsumer.props.email,
        firstName: updatedConsumer.props.firstName,
        lastName: updatedConsumer.props.lastName,
        nobaUserID: updatedConsumer.props._id,
      });
    }

    return updatedConsumer;
  }

  async findConsumerByEmailOrPhone(emailOrPhone: string): Promise<Result<Consumer>> {
    const isEmail = Utils.isEmail(emailOrPhone);
    const consumerResult = isEmail
      ? await this.consumerRepo.getConsumerByEmail(emailOrPhone.toLowerCase())
      : await this.consumerRepo.getConsumerByPhone(emailOrPhone);
    return consumerResult;
  }

  async findConsumerById(consumerId: string): Promise<Consumer> {
    return this.consumerRepo.getConsumer(consumerId);
  }

  async addPaymentMethod(consumer: Consumer, paymentMethod: AddPaymentMethodDTO, partnerId: string): Promise<Consumer> {
    const addPaymentMethodResponse: AddPaymentMethodResponse = await this.paymentService.addPaymentMethod(
      consumer,
      paymentMethod,
      partnerId,
    );

    if (addPaymentMethodResponse.updatedConsumerData) {
      const result = await this.updateConsumer(addPaymentMethodResponse.updatedConsumerData);

      if (paymentMethod.type === PaymentType.CARD) {
        if (addPaymentMethodResponse.checkoutResponseData.paymentMethodStatus === PaymentMethodStatus.UNSUPPORTED) {
          // Do we want to send a different email here too? Currently just throw up to the UI as a 400.
          // Note that we are intentionally saving the payment method with this UNSUPPORTED status as
          // we may want to let the user know some day when their bank allows crypto.
          throw new BadRequestException(CardFailureExceptionText.NO_CRYPTO);
        }

        await this.notificationService.sendNotification(NotificationEventType.SEND_CARD_ADDED_EVENT, partnerId, {
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props._id,
          email: consumer.props.displayEmail,
          cardNetwork: addPaymentMethodResponse.newPaymentMethod.cardData.cardType,
          last4Digits: addPaymentMethodResponse.newPaymentMethod.cardData.last4Digits,
        });
      }

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

    const paymentMethod = consumer.getPaymentMethodByID(transaction.props.fiatPaymentInfo.paymentMethodID);

    if (paymentMethod === null) {
      throw new BadRequestException("Payment method does not exist for user");
    }

    if (paymentMethod.paymentProviderID === PaymentProvider.CHECKOUT) {
      return this.paymentService.requestCheckoutPayment(consumer, transaction, paymentMethod);
    } else {
      this.logger.error(
        `Error in making payment as payment provider ${
          paymentMethod.paymentProviderID
        } is not supported. Consumer: ${JSON.stringify(consumer)}, Transaction: ${JSON.stringify(transaction)}`,
      );
      throw new BadRequestException(`Payment provider ${paymentMethod.paymentProviderID} is not supported`);
    }
  }

  async removePaymentMethod(consumer: Consumer, paymentToken: string, partnerId: string): Promise<Consumer> {
    const paymentMethod = consumer.props.paymentMethods.filter(
      paymentMethod => paymentMethod.paymentToken === paymentToken,
    );
    if (paymentMethod.length === 0 || paymentMethod[0].status === PaymentMethodStatus.DELETED) {
      throw new NotFoundException("Payment Method id not found");
    }
    const paymentProviderID = paymentMethod[0].paymentProviderID;
    if (paymentProviderID === PaymentProvider.CHECKOUT) {
      await this.paymentService.removePaymentMethod(paymentToken);
    } else {
      throw new NotFoundException("Payment provider not found");
    }

    const filteredPaymentMethods = consumer.props.paymentMethods.filter(
      paymentMethod => paymentMethod.paymentToken !== paymentToken,
    );

    const deletedPaymentMethod = paymentMethod[0];

    deletedPaymentMethod.status = PaymentMethodStatus.DELETED;
    deletedPaymentMethod.isDefault = false;

    const updatedConsumer: ConsumerProps = {
      ...consumer.props,
      paymentMethods: [...filteredPaymentMethods, deletedPaymentMethod],
    };

    const result = await this.updateConsumer(updatedConsumer);

    await this.notificationService.sendNotification(NotificationEventType.SEND_CARD_DELETED_EVENT, partnerId, {
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      nobaUserID: consumer.props._id,
      email: consumer.props.displayEmail,
      cardNetwork: paymentMethod[0].cardData.cardType,
      last4Digits: paymentMethod[0].cardData.last4Digits,
    });
    return result;
  }

  async getFiatPaymentStatus(paymentId: string, paymentProvider: PaymentProvider): Promise<FiatTransactionStatus> {
    if (paymentProvider === PaymentProvider.CHECKOUT) {
      return this.paymentService.getFiatPaymentStatus(paymentId);
    } else {
      throw new BadRequestException("Payment provider is not supported");
    }
  }

  async getPaymentMethodProvider(consumerId: string, paymentToken: string): Promise<PaymentProvider> {
    const consumer = await this.getConsumer(consumerId);
    const paymentMethod = consumer.props.paymentMethods.filter(
      paymentMethod =>
        paymentMethod.paymentToken === paymentToken && paymentMethod.status !== PaymentMethodStatus.DELETED,
    );
    if (paymentMethod.length === 0) {
      throw new NotFoundException(`Payment method with token ${paymentToken} not found for consumer: ${consumerId}`);
    }

    return paymentMethod[0].paymentProviderID as PaymentProvider;
  }

  async updatePaymentMethod(consumerID: string, paymentMethod: PaymentMethod): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerID);
    const otherPaymentMethods = consumer.props.paymentMethods.filter(
      existingPaymentMethod => existingPaymentMethod.paymentToken !== paymentMethod.paymentToken,
    );

    const currentPaymentMethod = consumer.props.paymentMethods.filter(
      currentMethod =>
        currentMethod.paymentToken === paymentMethod.paymentToken &&
        currentMethod.status !== PaymentMethodStatus.DELETED,
    );

    if (currentPaymentMethod.length === 0) {
      throw new BadRequestException(
        `Payment method with token ${paymentMethod.paymentToken} does not exist for consumer`,
      );
    }

    let updatedPaymentMethods = [...otherPaymentMethods, paymentMethod];

    if (paymentMethod.isDefault) {
      const existingDefaultPaymentMethod = otherPaymentMethods.filter(method => method.isDefault)[0];
      const existingNonDefaultPaymentMethods = otherPaymentMethods.filter(method => !method.isDefault);
      if (existingDefaultPaymentMethod) {
        existingDefaultPaymentMethod.isDefault = false;
        updatedPaymentMethods = [...existingNonDefaultPaymentMethods, existingDefaultPaymentMethod, paymentMethod];
      }
    }

    return await this.updateConsumer({
      ...consumer.props,
      paymentMethods: updatedPaymentMethods,
    });
  }

  async sendWalletVerificationOTP(consumer: Consumer, walletAddress: string, partnerId: string) {
    const otp: number = Math.floor(100000 + Math.random() * 900000);
    await this.otpRepo.deleteAllOTPsForUser(consumer.props.email, consumerIdentityIdentifier);
    await this.otpRepo.saveOTP(consumer.props.email, otp, consumerIdentityIdentifier, partnerId);
    await this.notificationService.sendNotification(
      NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
      partnerId,
      {
        email: consumer.props.displayEmail,
        otp: otp.toString(),
        walletAddress: walletAddress,
        firstName: consumer.props.firstName,
        nobaUserID: consumer.props._id,
      },
    );
  }

  async confirmWalletUpdateOTP(consumer: Consumer, walletAddress: string, otp: number, partnerID: string) {
    // Verify if the otp is correct
    const cryptoWallet = this.getCryptoWallet(consumer, walletAddress, partnerID);

    if (cryptoWallet === null) {
      throw new BadRequestException("Crypto wallet does not exist for user");
    }

    const actualOtp = await this.otpRepo.getOTP(consumer.props.email, consumerIdentityIdentifier, partnerID);
    const currentDateTime: number = new Date().getTime();

    if (actualOtp.props.otp !== otp || currentDateTime > actualOtp.props.otpExpiryTime) {
      // If otp doesn't match or if it is expired then raise unauthorized exception
      throw new UnauthorizedException();
    } else {
      // Just delete the OTP and proceed further
      await this.otpRepo.deleteOTP(actualOtp.props._id); // Delete the OTP
    }

    // mark the wallet verified

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

  getCryptoWallet(consumer: Consumer, address: string, partnerID: string): CryptoWallet {
    const cryptoWallets = consumer.props.cryptoWallets.filter(
      wallet => wallet.address === address && wallet.partnerID === partnerID && wallet.status !== WalletStatus.DELETED,
    );

    if (cryptoWallets.length === 0) {
      return null;
    }

    return cryptoWallets[0];
  }

  async addOrUpdateCryptoWallet(consumer: Consumer, cryptoWallet: CryptoWallet): Promise<Consumer> {
    let allCryptoWallets = consumer.props.cryptoWallets;

    const selectedWallet = allCryptoWallets.filter(
      wallet => wallet.address === cryptoWallet.address && wallet.partnerID === cryptoWallet.partnerID,
    );

    const remainingWallets = allCryptoWallets.filter(
      wallet => !(wallet.address === cryptoWallet.address && wallet.partnerID === cryptoWallet.partnerID),
    );
    // Send the verification OTP to the user
    if (cryptoWallet.status == WalletStatus.PENDING) {
      await this.sendWalletVerificationOTP(consumer, cryptoWallet.address, cryptoWallet.partnerID);
    }
    const partner: Partner = await this.partnerService.getPartner(cryptoWallet.partnerID);
    if (partner.props.config === null || partner.props.config === undefined) {
      partner.props.config = {} as any;
    }
    // By default the wallet is private.
    cryptoWallet.isPrivate =
      partner.props.config.privateWallets === null || partner.props.config.privateWallets === undefined
        ? true
        : partner.props.config.privateWallets;

    // It's an add
    if (selectedWallet.length === 0) {
      allCryptoWallets.push(cryptoWallet);
    } else {
      allCryptoWallets = [...remainingWallets, cryptoWallet];
    }

    const updatedConsumer = await this.updateConsumer({
      ...consumer.props,
      cryptoWallets: allCryptoWallets,
    });
    return updatedConsumer;
  }

  async removeCryptoWallet(consumer: Consumer, cryptoWalletAddress: string, partnerID: string): Promise<Consumer> {
    // You can have the same wallet for multiple partners so we want to be sure to only delete the one for the
    // current partner.
    const otherCryptoWallets = consumer.props.cryptoWallets.filter(
      existingCryptoWallet =>
        existingCryptoWallet.address !== cryptoWalletAddress || existingCryptoWallet.partnerID !== partnerID,
    );

    const currentWallet = consumer.props.cryptoWallets.filter(
      cryptoWallet => cryptoWallet.address === cryptoWalletAddress && cryptoWallet.partnerID === partnerID,
    )[0];

    if (!currentWallet) {
      throw new NotFoundException("Crypto wallet not found for user");
    }

    currentWallet.status = WalletStatus.DELETED;

    const updatedConsumer = await this.updateConsumer({
      ...consumer.props,
      cryptoWallets: [...otherCryptoWallets, currentWallet],
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
