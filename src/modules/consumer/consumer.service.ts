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
import { OTPService } from "../common/otp.service";
import { KmsService } from "../common/kms.service";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { NotificationService } from "../notifications/notification.service";
import { Transaction } from "../transaction/domain/Transaction";
import { Consumer, ConsumerProps } from "./domain/Consumer";
import { PaymentMethod, PaymentMethodProps } from "./domain/PaymentMethod";
import { CryptoWallet } from "./domain/CryptoWallet";
import { PaymentRequestResponse } from "./domain/Types";
import { UserVerificationStatus } from "./domain/UserVerificationStatus";
import { NotificationMethod } from "./dto/AddCryptoWalletDTO";
import { UserEmailUpdateRequest } from "./dto/EmailVerificationDTO";
import { UserPhoneUpdateRequest } from "./dto/PhoneVerificationDTO";
import { IConsumerRepo } from "./repos/consumer.repo";
import { DocumentVerificationStatus, KYCStatus, PaymentProvider, WalletStatus } from "@prisma/client";
import { QRService } from "../common/qrcode.service";
import { ContactConsumerRequestDTO } from "./dto/ContactConsumerRequestDTO";
import { findFlag } from "country-list-with-dial-code-and-flag";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { EmployeeService } from "../employee/employee.service";
import { Employee, EmployeeAllocationCurrency } from "../employee/domain/Employee";
import { ConsumerSearchDTO } from "./dto/consumer.search.dto";
import { ConsumerMapper } from "./mappers/ConsumerMapper";
import { Identification } from "./domain/Identification";
import { CreateIdentificationDTO } from "./dto/create.identification.dto";

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
  private readonly sanctionedCryptoWalletService: SanctionedCryptoWalletService;

  @Inject()
  private readonly otpService: OTPService;

  @Inject()
  private readonly consumerMapper: ConsumerMapper;

  private otpOverride: number;
  private qrCodePrefix: string;

  constructor(
    private readonly configService: CustomConfigService,
    private readonly qrService: QRService,
    private readonly employeeService: EmployeeService,
  ) {
    this.otpOverride = this.configService.get(STATIC_DEV_OTP);
    this.qrCodePrefix = this.configService.get("QR_CODE_PREFIX");
  }

  async getConsumer(consumerID: string): Promise<Consumer> {
    return this.consumerRepo.getConsumer(consumerID);
  }

  async getConsumerHandle(consumerID: string): Promise<string> {
    const consumer = await this.getConsumer(consumerID);
    if (!consumer) return null;
    return consumer.props.handle;
  }

  // Removes $ if present from handle
  cleanHandle(handle: string): string {
    if (!handle) return handle;

    if (handle.startsWith("$")) {
      handle = handle.slice(1);
    }

    return handle.toLowerCase().trim();
  }

  private analyseHandle(handle: string): void {
    // Only alpha-numeric characters and "-"  and 22 characters
    const regex = new RegExp("^[a-zA-Z0-9ñáéíóúü][a-zA-Z0-9ñáéíóúü-]{2,22}$");
    if (handle.length < 3 || handle.length > 22) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "'handle' should be between 3 and 22 charcters long.",
      });
    }

    if (!regex.test(handle)) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "'handle' can't start with an '-' and can only contain alphanumeric characters & '-'.",
      });
    }

    const filter = new BadWordFilter({ placeHolder: "$" });
    const cleanedHandle = filter.clean(handle);
    if (cleanedHandle.indexOf("$") !== -1) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Specified 'handle' is reserved. Please choose a different one.",
      });
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

  generateOTP(email?: string): number {
    if (this.otpOverride) {
      return this.otpOverride;
    } else if (email?.toLowerCase() === Utils.TEST_USER_EMAIL) {
      return Utils.get6DigitDate();
    } else {
      return Utils.generateOTP();
    }
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
        referralCode: Utils.getAlphaNanoID(15),
      });

      const result = await this.consumerRepo.createConsumer(newConsumer);
      if (isEmail) {
        await this.notificationService.sendNotification(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, {
          email: emailOrPhone,
          locale: result.props.locale,
          firstName: result.props.firstName,
          lastName: result.props.lastName,
          nobaUserID: result.props.id,
        });
      }
      return result;
    }

    return consumerResult.getValue();
  }

  generateDefaultHandle(firstName: string, lastName: string): string {
    const randomAppend = Math.random().toString(36).substring(2, 5).toUpperCase();
    const handle = `${firstName.replaceAll(".", "").substring(0, 10)}-${lastName
      .replaceAll(".", "")
      .substring(0, 2)}${randomAppend}`;
    return this.removeAllUnsupportedHandleCharacters(handle);
  }

  async updateConsumer(consumerProps: Partial<ConsumerProps>): Promise<Consumer> {
    const consumer = await this.getConsumer(consumerProps.id);
    // If we don't have a handle, but we do have a first name, then we can generate a handle.
    // Else if the handle is being set NOW, we need to validate it.
    if (!consumer.props.handle && consumer.props.firstName && consumer.props.lastName) {
      consumerProps.handle = this.generateDefaultHandle(consumer.props.firstName, consumer.props.lastName);
      let counter = 0;
      while (!(await this.isHandleAvailable(consumerProps.handle))) {
        if (counter > 5) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
            message: "Could not generate a handle.",
          });
        }

        consumerProps.handle = this.generateDefaultHandle(consumer.props.firstName, consumer.props.lastName);
        counter++;
      }
    } else if (consumerProps.handle !== undefined && consumerProps.handle !== null) {
      this.analyseHandle(consumerProps.handle);
    }

    Consumer.createConsumer({
      ...consumer.props,
      ...consumerProps,
    });

    try {
      return await this.consumerRepo.updateConsumer(consumer.props.id, consumerProps);
    } catch (e) {
      this.logger.error(`updateConsumer failed with error: ${e}`);
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        message: "Database error updating consumer. Confirm your input values and see logs for details.",
      });
    }
  }

  async sendOtpToPhone(consumerID: string, phone: string) {
    const otp = this.generateOTP();
    await this.otpService.saveOTP(phone, consumerIdentityIdentifier, otp);
    await this.notificationService.sendNotification(NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT, {
      locale: phone.startsWith("+57") ? "es_co" : "en_us", // TODO: CRYPTO-894
      phone,
      otp: otp.toString(),
    });
  }

  async updateConsumerPhone(consumer: Consumer, reqData: UserPhoneUpdateRequest): Promise<Consumer> {
    const isOtpValid = await this.otpService.checkIfOTPIsValidAndCleanup(
      reqData.phone,
      consumerIdentityIdentifier,
      reqData.otp,
    );

    if (!isOtpValid) {
      throw new BadRequestException("OTP is incorrect");
    }

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
    const otp = this.generateOTP(consumer.props.email);

    await this.otpService.saveOTP(email, consumerIdentityIdentifier, otp);

    await this.notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, {
      locale: consumer.props.locale,
      email: email,
      otp: otp.toString(),
      firstName: consumer.props.firstName ?? undefined,
    });
  }

  async updateConsumerEmail(consumer: Consumer, reqData: UserEmailUpdateRequest): Promise<Consumer> {
    const isOtpValid = await this.otpService.checkIfOTPIsValidAndCleanup(
      reqData.email,
      consumerIdentityIdentifier,
      reqData.otp,
    );

    if (!isOtpValid) {
      throw new BadRequestException("OTP is incorrect");
    }

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
        locale: consumer.props.locale,
        email: updatedConsumer.props.email,
        firstName: updatedConsumer.props.firstName,
        lastName: updatedConsumer.props.lastName,
        nobaUserID: updatedConsumer.props.id,
      });
    }

    return updatedConsumer;
  }

  async findConsumersByContactInfo(contactInfoList: ContactConsumerRequestDTO[]): Promise<Consumer[]> {
    const consumerPromiseList = new Array<Promise<Result<Consumer>>>();
    for (const contactInfo of contactInfoList) {
      const possiblePhoneNumbers = contactInfo.phoneNumbers.map(phone => {
        return this.normalizePhoneNumber(phone.digits, phone.countryCode);
      });
      const possibleEmails = contactInfo.emails.map(email => email.toLowerCase());

      const consumerResultPromise = this.consumerRepo.findConsumerByContactInfo({
        phoneNumbers: possiblePhoneNumbers,
        emails: possibleEmails,
      });
      consumerPromiseList.push(consumerResultPromise);
    }

    const consumerResultList = await Promise.all(consumerPromiseList);
    return consumerResultList.map(consumerResult => {
      if (!consumerResult.isSuccess) {
        return null;
      }

      return consumerResult.getValue();
    });
  }

  async findConsumersByPublicInfo(searchString: string, limit: number): Promise<Consumer[]> {
    const consumerResultList = await this.consumerRepo.findConsumersByPublicInfo(searchString, limit);
    if (!consumerResultList.isSuccess) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        error: consumerResultList.error,
        message: "Error finding consumers by public info",
      });
    }

    const activeConsumers = [];
    consumerResultList.getValue().forEach(consumer => {
      if (this.isActiveConsumer(consumer)) {
        activeConsumers.push(consumer);
      }
    });

    return activeConsumers;
  }

  async findConsumerByEmailOrPhone(emailOrPhone: string): Promise<Result<Consumer>> {
    const isEmail = Utils.isEmail(emailOrPhone);
    const consumerResult = isEmail
      ? await this.consumerRepo.getConsumerByEmail(emailOrPhone.toLowerCase())
      : await this.consumerRepo.getConsumerByPhone(emailOrPhone);
    return consumerResult;
  }

  async findConsumers(filter: ConsumerSearchDTO): Promise<Consumer[]> {
    // If consumerID is populated, it is unique and this is all we want to search for
    if (filter.consumerID) {
      const consumer = await this.consumerRepo.getConsumer(filter.consumerID);
      if (!consumer) {
        return [];
      }
      return [consumer];
    } else {
      const result = await this.consumerRepo.findConsumersByStructuredFields({
        ...(filter.name && { name: filter.name }),
        ...(filter.email && { email: filter.email }),
        ...(filter.phone && { phone: filter.phone }),
        ...(filter.handle && { handle: filter.handle }),
        ...(filter.kycStatus && { kycStatus: filter.kycStatus }),
      });

      if (result.isSuccess) {
        return result.getValue();
      }

      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        error: result.error,
        message: "Error finding consumers with supplied search criteria",
      });
    }
  }

  /**
   * Takes a consumer ID or handle and looks up the Consumer, then checks the various flags and KYC status
   * to ensure they are in good standing before finally returning the Consumer object.
   */
  async getActiveConsumer(consumerIDOrHandle: string): Promise<Consumer> {
    let consumer: Consumer;
    if (consumerIDOrHandle.startsWith("$")) {
      consumer = await this.consumerRepo.getConsumerByHandle(consumerIDOrHandle.replace("$", ""));
      if (!consumer) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid Noba Tag",
        });
      }
    } else {
      consumer = await this.consumerRepo.getConsumer(consumerIDOrHandle);
      if (!consumer) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid Consumer ID",
        });
      }
    }

    // User is only "active" if they are not locked or disabled and have a KYC status of Approved and doc status is in good standing
    if (!this.isActiveConsumer(consumer)) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Unable to transact with this user at this time",
      });
    }

    return consumer;
  }

  async findConsumerIDByHandle(handle: string): Promise<string> {
    return this.consumerRepo.getConsumerIDByHandle(this.cleanHandle(handle));
  }

  async findConsumerIDByReferralCode(referralCode: string): Promise<string> {
    return this.consumerRepo.getConsumerIDByReferralCode(referralCode);
  }

  async subscribeToPushNotifications(consumerID: string, pushToken: string): Promise<string> {
    return this.notificationService.subscribeToPushNotifications(consumerID, pushToken);
  }

  async unsubscribeFromPushNotifications(consumerID: string, pushToken: string): Promise<string> {
    return this.notificationService.unsubscribeFromPushNotifications(consumerID, pushToken);
  }

  async getBase64EncodedQRCode(url: string): Promise<string> {
    return this.qrService.generateQRCode(url);
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

  async getAllPaymentMethodsForConsumer(consumerID: string): Promise<PaymentMethod[]> {
    return this.consumerRepo.getAllPaymentMethodsForConsumer(consumerID);
  }

  async getPaymentMethodProvider(consumerID: string, paymentMethodID: string): Promise<PaymentProvider> {
    const paymentMethod = await this.consumerRepo.getPaymentMethodForConsumer(paymentMethodID, consumerID);
    if (!paymentMethod) throw new NotFoundException("Payment method with requested id is not found");

    return paymentMethod.props.paymentProvider;
  }

  async updatePaymentMethod(
    consumerID: string,
    paymentMethodProps: Partial<PaymentMethodProps>,
  ): Promise<PaymentMethod> {
    const selectedPaymentMethod = await this.consumerRepo.getPaymentMethodForConsumer(
      paymentMethodProps.id,
      consumerID,
    );

    if (!selectedPaymentMethod) {
      throw new BadRequestException(`Payment method with id ${paymentMethodProps.id} does not exist for consumer`);
    }

    return this.consumerRepo.updatePaymentMethod(paymentMethodProps.id, paymentMethodProps);
  }

  async getAllConsumerWallets(consumerID: string): Promise<CryptoWallet[]> {
    return this.consumerRepo.getAllCryptoWalletsForConsumer(consumerID);
  }

  async sendWalletVerificationOTP(
    consumer: Consumer,
    walletAddress: string,
    notificationMethod: NotificationMethod = NotificationMethod.EMAIL,
  ): Promise<void> {
    const otp = this.generateOTP(consumer.props.email);

    // Set otp reference to consumer email if notification method is email, else set to phone number
    const otpReference = notificationMethod === NotificationMethod.EMAIL ? consumer.props.email : consumer.props.phone;

    await this.otpService.saveOTP(otpReference, consumerIdentityIdentifier, otp);
    if (notificationMethod == NotificationMethod.EMAIL) {
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
        {
          locale: consumer.props.locale,
          email: consumer.props.displayEmail,
          otp: otp.toString(),
          walletAddress: walletAddress,
          firstName: consumer.props.firstName,
          nobaUserID: consumer.props.id,
        },
      );
    } else if (notificationMethod == NotificationMethod.PHONE) {
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
        {
          locale: consumer.props.locale,
          phone: consumer.props.phone,
          otp: otp.toString(),
          walletAddress: walletAddress,
          firstName: consumer.props.firstName,
          nobaUserID: consumer.props.id,
        },
      );
    }
  }

  async confirmWalletUpdateOTP(
    consumer: Consumer,
    cryptoWalletID: string,
    otp: number,
    notificationMethod: NotificationMethod = NotificationMethod.EMAIL,
  ): Promise<CryptoWallet> {
    // Verify if the otp is correct
    const cryptoWallet = await this.getCryptoWallet(consumer, cryptoWalletID);

    if (cryptoWallet === null) {
      throw new BadRequestException("Crypto wallet does not exist for user");
    }

    const isOtpValid = await this.otpService.checkIfOTPIsValidAndCleanup(
      notificationMethod === NotificationMethod.EMAIL ? consumer.props.email : consumer.props.phone,
      consumerIdentityIdentifier,
      otp,
    );

    if (!isOtpValid) {
      // If otp doesn't match or if it is expired then raise unauthorized exception
      throw new UnauthorizedException("Invalid OTP");
    }

    // Check wallet sanctions status
    const isSanctionedWallet = await this.sanctionedCryptoWalletService.isWalletSanctioned(cryptoWallet.props.address);
    if (isSanctionedWallet) {
      // Flag the wallet if it is a sanctioned wallet address.
      cryptoWallet.props.status = WalletStatus.FLAGGED;
      this.logger.error(
        `Failed to add a sanctioned wallet: ${cryptoWallet.props.address} for consumer: ${consumer.props.id}`,
      );
      await this.addOrUpdateCryptoWallet(consumer, cryptoWallet);
      throw new BadRequestException({ message: "Failed to add wallet" });
    }
    cryptoWallet.props.status = WalletStatus.APPROVED;

    return await this.addOrUpdateCryptoWallet(consumer, cryptoWallet);
  }

  async getCryptoWallet(consumer: Consumer, cryptoWalletID: string): Promise<CryptoWallet> {
    return this.consumerRepo.getCryptoWalletForConsumer(cryptoWalletID, consumer.props.id);
  }

  async addOrUpdateCryptoWallet(
    consumer: Consumer,
    cryptoWallet: CryptoWallet,
    notificationMethod?: NotificationMethod,
  ): Promise<CryptoWallet> {
    const selectedWallet = await this.consumerRepo.getCryptoWalletForConsumer(cryptoWallet.props.id, consumer.props.id);
    let result: CryptoWallet;
    // It's an add

    if (cryptoWallet.props.status === WalletStatus.PENDING) {
      await this.sendWalletVerificationOTP(consumer, cryptoWallet.props.address, notificationMethod);
    }

    if (!selectedWallet) {
      result = await this.consumerRepo.addCryptoWallet(cryptoWallet);
    } else {
      result = await this.consumerRepo.updateCryptoWallet(cryptoWallet.props.id, cryptoWallet.props);
    }

    return result;
  }

  async removeCryptoWallet(consumer: Consumer, cryptoWalletID: string): Promise<void> {
    const selectedWallet = await this.consumerRepo.getCryptoWalletForConsumer(cryptoWalletID, consumer.props.id);
    if (!selectedWallet) {
      throw new NotFoundException(`Crypto wallet with id ${cryptoWalletID} not found for consumer`);
    }
    selectedWallet.props.status = WalletStatus.DELETED;
    await this.addOrUpdateCryptoWallet(consumer, selectedWallet);
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

  async registerWithAnEmployer(
    employerID: string,
    consumerID: string,
    allocationAmountInPesos: number,
  ): Promise<Employee> {
    const employee: Employee = await this.employeeService.createEmployee(
      allocationAmountInPesos,
      employerID,
      consumerID,
    );

    // TODO: Design a way to post to Bubble efficiently without blocking end users.
    const consumer: Consumer = await this.consumerRepo.getConsumer(consumerID);
    if (employee.allocationCurrency !== EmployeeAllocationCurrency.COP) {
      throw new ServiceException({
        message: "Only COP is supported as 'allocationCurrency'",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    await this.notificationService.sendNotification(NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT, {
      locale: consumer.props.locale,
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      phone: consumer.props.phone,
      employerReferralID: employerID,
      nobaEmployeeID: employee.id,
      allocationAmountInPesos: employee.allocationAmount,
    });

    return employee;
  }

  async listLinkedEmployers(consumerID: string): Promise<Employee[]> {
    return this.employeeService.getEmployeesForConsumerID(consumerID);
  }

  async updateEmployerAllocationAmount(
    employerID: string,
    consumerID: string,
    allocationAmountInPesos: number,
  ): Promise<Employee> {
    if (allocationAmountInPesos < 0) {
      throw new ServiceException({
        message: "'allocationAmountInPesos' should be greater than 0",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }
    if (!consumerID) {
      throw new ServiceException({
        message: "'consumerID' should be provided",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }
    if (!employerID) {
      throw new ServiceException({
        message: "'employerID' should be provided",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const employee: Employee = await this.employeeService.getEmployeeByConsumerAndEmployerID(consumerID, employerID);
    if (!employee) {
      throw new ServiceException({
        message: `Employee with 'consumerID' ${consumerID} and 'employerID' ${employerID} does not exist`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    // This method can bump down the actual amount allocated based on employer maximum,
    // so be sure we use that updated amount when updating in bubble.
    const result: Employee = await this.employeeService.updateEmployee(employee.id, {
      allocationAmount: allocationAmountInPesos,
    });
    // TODO: Design a way to post to Bubble efficiently without blocking end users.
    await this.notificationService.updateEmployeeAllocationInBubble(employee.id, result.allocationAmount);

    return result;
  }

  async sendEmployerRequestEmail(email: string, locale: string, firstName: string, lastName: string): Promise<void> {
    if (!email) {
      throw new ServiceException({
        message: "Email address is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    if (!Utils.isValidEmail(email)) {
      throw new ServiceException({
        message: "Email address is invalid",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    await this.notificationService.sendNotification(NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT, {
      email: email,
      locale: locale,
      firstName: firstName,
      lastName: lastName,
    });
  }

  async addIdentification(consumerID: string, identification: CreateIdentificationDTO): Promise<Identification> {
    if (!identification.type) {
      throw new ServiceException({
        message: "Identification type is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    if (!identification.countryCode) {
      throw new ServiceException({
        message: "Country code is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    if (!identification.value) {
      throw new ServiceException({
        message: "Identification value is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const result = await this.consumerRepo.addIdentification({
      consumerID: consumerID,
      ...identification,
    });
    return result;
  }

  getVerificationStatus(consumer: Consumer): UserVerificationStatus {
    // TODO: Write logic for verification status based on current modifications of users verification data
    throw new Error("Method not implemented");
  }

  private normalizePhoneNumber(digits: string, countryCode: string): string {
    if (digits && digits[0] === "+") {
      return digits;
    }

    const { dial_code } = findFlag(countryCode);
    return dial_code + digits;
  }
  private removeAllUnsupportedHandleCharacters(text: string): string {
    if (text === undefined || text === null) return "user-";

    const regex = new RegExp("^[a-zA-Z0-9ñáéíóúü-]{1,1}$");
    let result = "";

    for (let i = 0; i < text.length; i++) {
      if (regex.test(text[i])) result += text[i];
    }

    if (result.length < 1) result += "user-";
    while (result.length < 3) result += "-";

    return result.substring(0, 16);
  }

  private isActiveConsumer(consumer: Consumer): boolean {
    if (
      consumer.props.isLocked ||
      consumer.props.isDisabled ||
      consumer.props.verificationData == null ||
      consumer.props.verificationData.kycCheckStatus !== KYCStatus.APPROVED ||
      (consumer.props.verificationData.documentVerificationStatus !== DocumentVerificationStatus.APPROVED &&
        consumer.props.verificationData.documentVerificationStatus !== DocumentVerificationStatus.NOT_REQUIRED &&
        consumer.props.verificationData.documentVerificationStatus !== DocumentVerificationStatus.LIVE_PHOTO_VERIFIED)
    ) {
      return false;
    }
    return true;
  }
}
