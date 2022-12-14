import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import BadWordFilter from "bad-words-es";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { KmsKeyType } from "../../config/configtypes/KmsConfigs";
import { STATIC_DEV_OTP } from "../../config/ConfigurationUtils";
import { Result } from "../../core/logic/Result";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Utils } from "../../core/utils/Utils";
import { consumerIdentityIdentifier } from "../auth/domain/IdentityType";
import { OTP } from "../auth/domain/OTP";
import { IOTPRepo } from "../auth/repo/OTPRepo";
import { KmsService } from "../common/kms.service";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { SMSService } from "../common/sms.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { NotificationService } from "../notifications/notification.service";
import { CircleClient } from "../psp/circle.client";
import { PaymentService } from "../psp/payment.service";
import { Transaction } from "../transactions/domain/Transaction";
import { Consumer, ConsumerProps, PaymentMethod } from "./domain/Consumer";
import { CryptoWallet } from "./domain/CryptoWallet";
import { FiatTransactionStatus, PaymentRequestResponse } from "./domain/Types";
import { UserVerificationStatus } from "./domain/UserVerificationStatus";
import { NotificationMethod } from "./dto/AddCryptoWalletDTO";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import { UserEmailUpdateRequest } from "./dto/EmailVerificationDTO";
import { UserPhoneUpdateRequest } from "./dto/PhoneVerificationDTO";
import { IConsumerRepo } from "./repos/ConsumerRepo";
import { PaymentProvider, PaymentMethodStatus, WalletStatus, Prisma } from "@prisma/client";

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
  private readonly smsService: SMSService;

  @Inject()
  private readonly circleClient: CircleClient;

  private otpOverride: number;

  constructor(private readonly configService: CustomConfigService) {
    this.otpOverride = this.configService.get(STATIC_DEV_OTP);
  }

  async getConsumer(consumerID: string): Promise<Consumer> {
    return this.consumerRepo.getConsumer(consumerID);
  }

  // One thing to note here is that "idempotencyKey" is "determinstic" rather than
  // a short-lived value. This is an "intended" and an important design because -
  //
  // Multiple threads & multiple machines might be calling this function and if "idempotencyKey" is
  // not determintistic, it is very well possible that multiple Circle wallets are
  // created for same consumer.
  // Further, this problem will magnifies "significantly" because different there
  // might be lost transaction history because of certain race conditions where
  // the first assigned wallet is chosen for certain transactions and then the next
  // thread overrides the previous wallet after creating a new wallet
  // (because of it's local state) and thus all the further transactions will happen
  // on the new wallet and all the transactions made to the previous wallet are lost.
  // This is analogous to the classic "Lost Update" problem in database world :)
  //
  async getConsumerCircleWalletID(consumerID: string): Promise<string> {
    // const consumer: Consumer = await this.consumerRepo.getConsumer(consumerID);
    // if (consumer.props.circleWalletID) {
    //   return consumer.props.circleWalletID;
    // }

    // const circleWalletID: string = await this.circleClient.createWallet(consumerID);
    // await this.consumerRepo.updateConsumerCircleWalletID(consumerID, circleWalletID);

    // return circleWalletID;
    throw new Error("Not implemented!");
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
  async getOrCreateConsumerConditionally(emailOrPhone: string): Promise<Consumer> {
    const isEmail = Utils.isEmail(emailOrPhone);
    const email = isEmail ? emailOrPhone : null;
    const phone = !isEmail ? emailOrPhone : null;
    const consumerResult = await this.findConsumerByEmailOrPhone(emailOrPhone);
    if (consumerResult.isFailure) {
      const newConsumer = Consumer.createConsumer({
        email: email ? email.toLowerCase() : undefined,
        displayEmail: email ?? undefined,
        phone,
      });
      const result = await this.consumerRepo.createConsumer({
        email: newConsumer.props.email,
        id: newConsumer.props.id,
        displayEmail: newConsumer.props.displayEmail,
      });
      if (isEmail) {
        await this.notificationService.sendNotification(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, {
          email: emailOrPhone,
          firstName: result.props.firstName,
          lastName: result.props.lastName,
          nobaUserID: result.props.id,
        });
      }
      return result;
    }

    return consumerResult.getValue();
  }

  async updateConsumer(consumerProps: Partial<ConsumerProps>): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerProps.id);
    if (consumerProps.handle !== undefined && consumerProps.handle !== null) {
      this.analyseHandle(consumerProps.handle);
    }

    const updatedConsumerRecord = Consumer.createConsumer({
      ...consumer.props,
      ...consumerProps,
    });
    const consumerUpdateInput: Prisma.ConsumerUpdateInput = {
      firstName: updatedConsumerRecord.props.firstName,
      lastName: updatedConsumerRecord.props.lastName,
      handle: updatedConsumerRecord.props.handle,
      dateOfBirth: updatedConsumerRecord.props.dateOfBirth,
      isDisabled: updatedConsumerRecord.props.isDisabled,
      isLocked: updatedConsumerRecord.props.isLocked,
      updatedTimestamp: new Date(),
      ...(consumerProps.phone && { phone: updatedConsumerRecord.props.phone }),
      ...(consumerProps.email && { phone: updatedConsumerRecord.props.email }),
      ...(consumerProps.displayEmail && { phone: updatedConsumerRecord.props.displayEmail }),
      ...(consumerProps.socialSecurityNumber && {
        socialSecurityNumber: await this.kmsService.encryptString(
          updatedConsumerRecord.props.socialSecurityNumber,
          KmsKeyType.SSN,
        ),
      }),
      ...(consumerProps.address && { address: { update: { ...updatedConsumerRecord.props.address } } }),
      ...(consumerProps.verificationData && {
        verificationData: { update: { ...updatedConsumerRecord.props.verificationData } },
      }),
    };

    const updatedConsumer = await this.consumerRepo.updateConsumer(consumer.props.id, consumerUpdateInput);
    return updatedConsumer;
  }

  async sendOtpToPhone(consumerID: string, phone: string) {
    const otp = this.generateOTP();
    await this.otpRepo.deleteAllOTPsForUser(phone, consumerIdentityIdentifier, consumerID);

    const otpObject = OTP.createOtp({
      emailOrPhone: Utils.stripSpaces(phone),
      identityType: consumerIdentityIdentifier,
      otp: otp,
      consumerID: consumerID,
    });
    this.otpRepo.saveOTPObject(otpObject);

    await this.smsService.sendSMS(phone, `${otp} is your one-time password to verify your phone number with Noba.`);
  }

  async updateConsumerPhone(consumer: Consumer, reqData: UserPhoneUpdateRequest): Promise<Consumer> {
    const otpResult = await this.otpRepo.getOTP(reqData.phone, consumerIdentityIdentifier, consumer.props.id);

    if (otpResult.props.otp !== reqData.otp) {
      throw new BadRequestException("OTP is incorrect");
    }

    await this.otpRepo.deleteOTP(otpResult.props.id);

    // Before updating the consumer, check to be sure this phone number isn't already linked to another account.
    // If it is, it would have been a signup within the period of time this OTP was valid.
    const existingConsumer = await this.findConsumerByEmailOrPhone(reqData.phone);
    if (existingConsumer.isSuccess) {
      // Somebody else already has this phone number, so deny update
      throw new BadRequestException("User already exists with this phone number");
    }

    const updatedConsumer = await this.updateConsumer({
      id: consumer.props.id,
      phone: reqData.phone,
    });
    return updatedConsumer;
  }

  async sendOtpToEmail(email: string, consumer: Consumer) {
    const otp = this.generateOTP();
    await this.otpRepo.deleteAllOTPsForUser(email, consumerIdentityIdentifier, consumer.props.id);

    await this.otpRepo.saveOTP(email, otp, consumerIdentityIdentifier, consumer.props.id);

    await this.notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, {
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

    await this.otpRepo.deleteOTP(otpResult.props.id);

    // Before updating the consumer, check to be sure this email address isn't already linked to another account.
    // If it is, it would have been a signup within the period of time this OTP was valid.
    const existingConsumer = await this.findConsumerByEmailOrPhone(reqData.email);
    if (existingConsumer.isSuccess) {
      // Somebody else already has this email number, so deny update
      // WARNING: Do not change this text as the app depends on this specific text string (to be fixed later)
      throw new BadRequestException("User already exists with this email address");
    }

    const updatedConsumer = await this.updateConsumer({
      id: consumer.props.id,
      email: reqData.email.toLowerCase(),
      displayEmail: reqData.email,
    });

    if (!consumer.props.email) {
      //email being added for the first time
      this.logger.info(`User email updated for first time sending welcome note, userId: ${consumer.props.id}`);
      await this.notificationService.sendNotification(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, {
        email: updatedConsumer.props.email,
        firstName: updatedConsumer.props.firstName,
        lastName: updatedConsumer.props.lastName,
        nobaUserID: updatedConsumer.props.id,
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

  async addPaymentMethod(consumer: Consumer, paymentMethod: AddPaymentMethodDTO): Promise<Consumer> {
    // const addPaymentMethodResponse: AddPaymentMethodResponse = await this.paymentService.addPaymentMethod(
    //   consumer,
    //   paymentMethod,
    // );

    // if (addPaymentMethodResponse.updatedConsumerData) {
    //   const result = await this.updateConsumer(addPaymentMethodResponse.updatedConsumerData);

    //   if (paymentMethod.type === PaymentType.CARD) {
    //     if (addPaymentMethodResponse.checkoutResponseData.paymentMethodStatus === PaymentMethodStatus.UNSUPPORTED) {
    //       // Do we want to send a different email here too? Currently just throw up to the UI as a 400.
    //       // Note that we are intentionally saving the payment method with this UNSUPPORTED status as
    //       // we may want to let the user know some day when their bank allows crypto.
    //       throw new BadRequestException(CardFailureExceptionText.NO_CRYPTO);
    //     }

    //     await this.notificationService.sendNotification(NotificationEventType.SEND_CARD_ADDED_EVENT, {
    //       firstName: consumer.props.firstName,
    //       lastName: consumer.props.lastName,
    //       nobaUserID: consumer.props.id,
    //       email: consumer.props.displayEmail,
    //       cardNetwork: addPaymentMethodResponse.newPaymentMethod.cardData.cardType,
    //       last4Digits: addPaymentMethodResponse.newPaymentMethod.cardData.last4Digits,
    //     });
    //   }

    //   return result;
    // }
    throw new Error("Not implemented!");
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
    throw new Error("Not implemented");

    // const paymentMethod = consumer.getPaymentMethodByID(transaction.props.fiatPaymentInfo.paymentMethodID);

    // if (paymentMethod === null) {
    //   throw new BadRequestException("Payment method does not exist for user");
    // }

    // if (paymentMethod.paymentProvider === PaymentProvider.CHECKOUT) {
    //   return this.paymentService.requestCheckoutPayment(consumer, transaction, paymentMethod);
    // } else {
    //   this.logger.error(
    //     `Error in making payment as payment provider ${
    //       paymentMethod.paymentProvider
    //     } is not supported. Consumer: ${JSON.stringify(consumer)}, Transaction: ${JSON.stringify(transaction)}`,
    //   );
    //   throw new BadRequestException(`Payment provider ${paymentMethod.paymentProvider} is not supported`);
    // }
  }

  async removePaymentMethod(consumer: Consumer, paymentToken: string): Promise<Consumer> {
    const paymentMethod = consumer.props.paymentMethods.filter(
      paymentMethod => paymentMethod.paymentToken === paymentToken,
    );
    if (paymentMethod.length === 0 || paymentMethod[0].status === PaymentMethodStatus.DELETED) {
      throw new NotFoundException("Payment Method id not found");
    }
    const paymentProviderID = paymentMethod[0].paymentProvider;
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

    await this.notificationService.sendNotification(NotificationEventType.SEND_CARD_DELETED_EVENT, {
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      nobaUserID: consumer.props.id,
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

    return paymentMethod[0].paymentProvider as PaymentProvider;
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

  async sendWalletVerificationOTP(
    consumer: Consumer,
    walletAddress: string,
    notificationMethod: NotificationMethod = NotificationMethod.EMAIL,
  ) {
    const otp = this.generateOTP();

    // Set otp reference to consumer email if notification method is email, else set to phone number
    const otpReference = notificationMethod === NotificationMethod.EMAIL ? consumer.props.email : consumer.props.phone;

    await this.otpRepo.deleteAllOTPsForUser(otpReference, consumerIdentityIdentifier, consumer.props.id);
    await this.otpRepo.saveOTP(otpReference, otp, consumerIdentityIdentifier, consumer.props.id);
    if (notificationMethod == NotificationMethod.EMAIL) {
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
        {
          email: consumer.props.displayEmail,
          otp: otp.toString(),
          walletAddress: walletAddress,
          firstName: consumer.props.firstName,
          nobaUserID: consumer.props.id,
        },
      );
    } else if (notificationMethod == NotificationMethod.PHONE) {
      await this.smsService.sendSMS(consumer.props.phone, `${otp} is your wallet verification code`);
    }
  }

  async confirmWalletUpdateOTP(
    consumer: Consumer,
    walletAddress: string,
    otp: number,
    consumerID: string,
    notificationMethod: NotificationMethod = NotificationMethod.EMAIL,
  ) {
    // Verify if the otp is correct
    const cryptoWallet = this.getCryptoWallet(consumer, walletAddress);

    if (cryptoWallet === null) {
      throw new BadRequestException("Crypto wallet does not exist for user");
    }

    const actualOtp = await this.otpRepo.getOTP(
      notificationMethod === NotificationMethod.EMAIL ? consumer.props.email : consumer.props.phone,
      consumerIdentityIdentifier,
      consumerID,
    );
    const currentDateTime: number = new Date().getTime();

    if (actualOtp.props.otp !== otp || currentDateTime > actualOtp.props.otpExpiryTime) {
      // If otp doesn't match or if it is expired then raise unauthorized exception
      throw new UnauthorizedException("Invalid OTP");
    } else {
      // Just delete the OTP and proceed further
      await this.otpRepo.deleteOTP(actualOtp.props.id); // Delete the OTP
    }

    // Check wallet sanctions status
    const isSanctionedWallet = await this.sanctionedCryptoWalletService.isWalletSanctioned(cryptoWallet.address);
    if (isSanctionedWallet) {
      // Flag the wallet if it is a sanctioned wallet address.
      cryptoWallet.status = WalletStatus.FLAGGED;
      this.logger.error(
        `Failed to add a sanctioned wallet: ${cryptoWallet.address} for consumer: ${consumer.props.id}`,
      );
      await this.addOrUpdateCryptoWallet(consumer, cryptoWallet, NotificationMethod.EMAIL);
      throw new BadRequestException({ message: "Failed to add wallet" });
    }
    cryptoWallet.status = WalletStatus.APPROVED;

    return await this.addOrUpdateCryptoWallet(consumer, cryptoWallet);
  }

  getCryptoWallet(consumer: Consumer, address: string): CryptoWallet {
    const cryptoWallets = consumer.props.cryptoWallets.filter(
      wallet => wallet.address === address && wallet.status !== WalletStatus.DELETED,
    );

    if (cryptoWallets.length === 0) {
      return null;
    }

    return cryptoWallets[0];
  }

  async addOrUpdateCryptoWallet(
    consumer: Consumer,
    cryptoWallet: CryptoWallet,
    notificationMethod?: NotificationMethod,
  ): Promise<Consumer> {
    const allCryptoWallets = consumer.props.cryptoWallets;

    const selectedWallet = allCryptoWallets.filter(wallet => wallet.address === cryptoWallet.address);

    const remainingWallets = allCryptoWallets.filter(wallet => !(wallet.address === cryptoWallet.address));
    // Send the verification OTP to the user
    if (cryptoWallet.status === WalletStatus.PENDING) {
      await this.sendWalletVerificationOTP(consumer, cryptoWallet.address, notificationMethod);
    }

    // It's an add
    // if (selectedWallet.length === 0) {
    //   allCryptoWallets.push(cryptoWallet);
    // } else {
    //   allCryptoWallets = [...remainingWallets, cryptoWallet];
    // }

    // return await this.updateConsumer({
    //   ...consumer.props,
    //   cryptoWallets: allCryptoWallets,
    // });
    return consumer;
  }

  async removeCryptoWallet(consumer: Consumer, cryptoWalletAddress: string): Promise<Consumer> {
    const otherCryptoWallets = consumer.props.cryptoWallets.filter(
      existingCryptoWallet => existingCryptoWallet.address !== cryptoWalletAddress,
    );

    const currentWallet = consumer.props.cryptoWallets.filter(
      cryptoWallet => cryptoWallet.address === cryptoWalletAddress,
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
    // const consumer = await this.getConsumer(consumerID);

    // return await this.updateConsumer({
    //   ...consumer.props,
    //   zhParticipantCode: zeroHashParticipantCode,
    // });
    throw new Error("Not implemented");
  }

  getVerificationStatus(consumer: Consumer): UserVerificationStatus {
    // TODO: Write logic for verification status based on current modifications of users verification data
    throw new Error("Method not implemented");
  }
}
