import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { KmsKeyType } from "../../config/configtypes/KmsConfigs";
import { Result } from "../../core/logic/Result";
import { IOTPRepo } from "../auth/repo/OTPRepo";
import { PaymentService } from "../psp/payment.service";
import { AddCreditCardPaymentMethodResponse } from "../psp/domain/AddPaymentMethodResponse";
import { KmsService } from "../common/kms.service";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { Partner } from "../partner/domain/Partner";
import { PartnerService } from "../partner/partner.service";
import { Transaction } from "../transactions/domain/Transaction";
import { CardFailureExceptionText } from "./CardProcessingException";
import { Consumer, ConsumerProps } from "./domain/Consumer";
import { CryptoWallet } from "./domain/CryptoWallet";
import { PaymentMethod, PaymentMethodType } from "./domain/PaymentMethod";
import { FiatTransactionStatus, PaymentRequestResponse } from "./domain/Types";
import { UserVerificationStatus } from "./domain/UserVerificationStatus";
import { PaymentMethodStatus, WalletStatus } from "./domain/VerificationStatus";
import { AddPaymentMethodDTO, PaymentType } from "./dto/AddPaymentMethodDTO";
import { IConsumerRepo } from "./repos/ConsumerRepo";
import { NotificationService } from "../notifications/notification.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { PaymentProvider } from "./domain/PaymentProvider";
import { PlaidClient } from "../psp/plaid.client";
import { RetrieveAccountDataResponse, TokenProcessor } from "../psp/domain/PlaidTypes";

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
  private readonly plaidClient: PlaidClient;

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
      await this.notificationService.sendNotification(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, partnerID, {
        email: emailOrPhone,
        firstName: result.props.firstName,
        lastName: result.props.lastName,
        nobaUserID: result.props._id,
      });
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

  async addPaymentMethod(consumer: Consumer, paymentMethod: AddPaymentMethodDTO, partnerId: string): Promise<Consumer> {
    switch (paymentMethod.type) {
      case PaymentType.CARD: {
        const addPaymentMethodResponse: AddCreditCardPaymentMethodResponse =
          await this.paymentService.addCreditCardPaymentMethod(consumer, paymentMethod, partnerId);

        if (addPaymentMethodResponse.updatedConsumerData) {
          const result = await this.updateConsumer(addPaymentMethodResponse.updatedConsumerData);

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
          return result;
        }
      }
      case PaymentType.ACH: {
        const accessToken: string = await this.plaidClient.exchangeForAccessToken({
          publicToken: paymentMethod.achDetails.token,
        });
        const accountData: RetrieveAccountDataResponse = await this.plaidClient.retrieveAccountData({
          accessToken: accessToken,
        });
        const processorToken: string = await this.plaidClient.createProcessorToken({
          accessToken: accessToken,
          accountID: accountData.accountID,
          tokenProcessor: TokenProcessor.CHECKOUT,
        });

        // Create or get Customer ID - even though we don't need it here, this ensures we have one
        // that we can use by the time we make a payment
        const [checkoutCustomerID, hasCustomerIDSaved] = await this.paymentService.createPspConsumerAccount(consumer);

        // const checkoutResponse = await this.checkoutService.performOneDollarACHTransaction(processorToken);
        // console.log(checkoutResponse);

        //TODO: Similar to card logic. Move the entire logic to payment.service and reuse for card and ACH addition
        const newPaymentMethod: PaymentMethod = {
          name: accountData.name,
          type: PaymentMethodType.ACH,
          achData: {
            // TODO(Plaid): Encrypt it.
            accessToken: accessToken,
            accountID: accountData.accountID,
            itemID: accountData.itemID,
            mask: accountData.mask,
            accountType: accountData.accountType,
          },
          imageUri: paymentMethod.imageUri,
          paymentProviderID: PaymentProvider.CHECKOUT,
          paymentToken: processorToken,
          status: PaymentMethodStatus.APPROVED,
        };

        let updatedConsumerProps: ConsumerProps;
        if (hasCustomerIDSaved) {
          updatedConsumerProps = {
            ...consumer.props,
            paymentMethods: [...consumer.props.paymentMethods, newPaymentMethod],
          };
        } else {
          updatedConsumerProps = {
            ...consumer.props,
            paymentMethods: [...consumer.props.paymentMethods, newPaymentMethod],
            paymentProviderAccounts: [
              ...consumer.props.paymentProviderAccounts,
              {
                providerID: PaymentProvider.CHECKOUT,
                providerCustomerID: checkoutCustomerID,
              },
            ],
          };
        }

        const result = await this.updateConsumer(updatedConsumerProps);
        return result;
      }
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

    const paymentMethod = consumer.getPaymentMethodByID(transaction.props.paymentMethodID);
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
    if (paymentMethod.length === 0) {
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

    const updatedConsumer: ConsumerProps = {
      ...consumer.props,
      paymentMethods: filteredPaymentMethods,
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
      paymentMethod => paymentMethod.paymentToken === paymentToken,
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

  async sendWalletVerificationOTP(consumer: Consumer, walletAddress: string, partnerId: string) {
    const otp: number = Math.floor(100000 + Math.random() * 900000);
    await this.otpRepo.deleteAllOTPsForUser(consumer.props.email, "CONSUMER");
    await this.otpRepo.saveOTP(consumer.props.email, otp, "CONSUMER");
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
    let allCryptoWallets = consumer.props.cryptoWallets;

    const selectedWallet = allCryptoWallets.filter(
      wallet => wallet.address === cryptoWallet.address && wallet.partnerID === cryptoWallet.partnerID,
    );

    const remainingWallets = allCryptoWallets.filter(
      wallet => !(wallet.address === cryptoWallet.address && wallet.partnerID === cryptoWallet.partnerID),
    );

    // It's an add
    if (selectedWallet.length === 0) {
      allCryptoWallets.push(cryptoWallet);
    } else {
      allCryptoWallets = [...remainingWallets, cryptoWallet];
    }

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

    const updatedConsumer = await this.updateConsumer({
      ...consumer.props,
      cryptoWallets: allCryptoWallets,
    });
    return updatedConsumer;
  }

  async removeCryptoWallet(consumer: Consumer, cryptoWalletAddress: string, partnerID: string): Promise<Consumer> {
    const otherCryptoWallets = consumer.props.cryptoWallets.filter(
      existingCryptoWallet =>
        existingCryptoWallet.address !== cryptoWalletAddress && existingCryptoWallet.partnerID !== partnerID,
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
