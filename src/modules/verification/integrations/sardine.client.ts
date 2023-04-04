import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import axios, { AxiosRequestConfig } from "axios";
import { KYCStatus, DocumentVerificationStatus } from "@prisma/client";
import { SardineConfigs } from "../../../config/configtypes/SardineConfigs";
import { SARDINE_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { ConsumerInformation, KYCFlow } from "../domain/ConsumerInformation";
import { DocumentInformation } from "../domain/DocumentInformation";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { IDVProvider } from "./IDVProvider";
import {
  AccountType,
  Address,
  CaseAction,
  CaseNotificationWebhookRequest,
  CaseStatus,
  Customer,
  CustomerType,
  DocumentType,
  DocumentVerificationErrorCodes,
  DocumentVerificationSardineResponse,
  FeedbackRequest,
  FeedbackStatus,
  FeedbackType,
  IdentityDocumentURLRequest,
  IdentityDocumentURLResponse,
  PaymentMethod,
  PaymentMethodTypes,
  Recipient,
  SardineCustomerRequest,
  SardineDeviceInformationResponse,
  SardineDocumentProcessingStatus,
  SardineDocumentVerificationInputData,
  SardineRiskLevels,
} from "./SardineTypeDefinitions";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import FormData from "form-data";
import { Consumer } from "../../consumer/domain/Consumer";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IDVerificationURLRequestLocale } from "../dto/IDVerificationRequestURLDTO";
import { ConsumerService } from "../../consumer/consumer.service";
import { WorkflowName } from "../../transaction/domain/Transaction";
import { Currency } from "../../transaction/domain/TransactionTypes";
import { TransactionVerification } from "../domain/TransactionVerification";
import { CircleService } from "../../psp/circle/circle.service";
import { Utils } from "../../../core/utils/Utils";
import { HealthCheckResponse, HealthCheckStatus } from "../../../core/domain/HealthCheckTypes";

@Injectable()
export class Sardine implements IDVProvider {
  private BASE_URI: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: CustomConfigService,
    private readonly consumerService: ConsumerService,
    private readonly circleService: CircleService,
  ) {
    this.BASE_URI = configService.get<SardineConfigs>(SARDINE_CONFIG_KEY).sardineBaseUri;
  }

  private getAxiosConfig(): AxiosRequestConfig {
    const clientID = this.configService.get<SardineConfigs>(SARDINE_CONFIG_KEY).clientID;
    const secretKey = this.configService.get<SardineConfigs>(SARDINE_CONFIG_KEY).secretKey;
    return {
      auth: {
        username: clientID,
        password: secretKey,
      },
    };
  }

  async getHealth(): Promise<HealthCheckResponse> {
    try {
      await axios.get(this.BASE_URI + "/v1/geo-coverage", this.getAxiosConfig());
      return {
        status: HealthCheckStatus.OK,
      };
    } catch (e) {
      return {
        status: HealthCheckStatus.UNAVAILABLE,
      };
    }
  }

  async verifyConsumerInformation(
    sessionKey: string,
    consumerInfo: ConsumerInformation,
    kycFlow: KYCFlow[],
  ): Promise<ConsumerVerificationResult> {
    const flowType = kycFlow.includes(KYCFlow.LOGIN)
      ? "login"
      : consumerInfo.address?.countryCode.toLocaleLowerCase() === "us"
      ? "kyc-us"
      : "kyc-non-us";
    const sardineRequest: SardineCustomerRequest = {
      flow: flowType,
      sessionKey: sessionKey,
      customer: {
        id: consumerInfo.userID,
        createdAtMillis: consumerInfo.createdTimestampMillis,
        firstName: consumerInfo.firstName,
        lastName: consumerInfo.lastName,
        dateOfBirth: consumerInfo.dateOfBirth,
        emailAddress: consumerInfo.email,
        isEmailVerified: true,
        type: CustomerType.CUSTOMER,
      },
      checkpoints: kycFlow.map(flow => {
        return flow.toString();
      }),
    };

    if (consumerInfo.address) {
      sardineRequest.customer.address = {
        street1: consumerInfo.address.streetLine1,
        street2: consumerInfo.address.streetLine2,
        city: consumerInfo.address.city,
        regionCode: consumerInfo.address.regionCode,
        postalCode: consumerInfo.address.postalCode,
        countryCode: consumerInfo.address.countryCode,
      };
    }

    if (consumerInfo.nationalID) {
      sardineRequest.customer.taxId = consumerInfo.nationalID.number;
    }

    if (consumerInfo.phoneNumber) {
      sardineRequest.customer.phone = consumerInfo.phoneNumber.replace(/ /g, "");
      sardineRequest.customer.isPhoneVerified = false;
    }

    try {
      const { data } = await axios.post(this.BASE_URI + "/v1/customers", sardineRequest, this.getAxiosConfig());
      if (data.level === SardineRiskLevels.VERY_HIGH) {
        return {
          status: KYCStatus.REJECTED,
          idvProviderRiskLevel: data.level,
        };
      } else if (data.level === SardineRiskLevels.HIGH) {
        return {
          status: KYCStatus.PENDING,
          idvProviderRiskLevel: data.level,
        };
      } else {
        return {
          status: KYCStatus.APPROVED,
          idvProviderRiskLevel: data.level,
        };
      }
    } catch (e) {
      if (e.response?.status == 422) {
        this.logger.error(`Sardine request failed for KYC: ${JSON.stringify(e.response.data)}`);
        throw new BadRequestException(`${JSON.stringify(e.response.data)}`);
      } else throw new BadRequestException(e);
    }
  }

  async verifyDocument(sessionKey: string, documentInfo: DocumentInformation, consumer: Consumer): Promise<string> {
    const formData = new FormData();
    formData.append("sessionKey", sessionKey);
    formData.append("customerId", documentInfo.userID);
    formData.append("frontImage", documentInfo.documentFrontImage.buffer, "frontImage.jpg");
    if (documentInfo.documentBackImage) {
      formData.append("backImage", documentInfo.documentBackImage.buffer, "backImage.jpg");
    }
    if (documentInfo.photoImage) {
      formData.append("photoImage", documentInfo.photoImage.buffer);
    }

    const inputData: SardineDocumentVerificationInputData = {
      dateOfBirth: consumer.props.dateOfBirth,
      issuingCountry: consumer.props.address.countryCode,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      address: {
        street1: consumer.props.address.streetLine1,
        street2: consumer.props.address.streetLine2,
        city: consumer.props.address.city,
        postalCode: consumer.props.address.postalCode,
        countryCode: consumer.props.address.countryCode,
        region: consumer.props.address.regionCode,
      },
    };

    formData.append("inputData", JSON.stringify(inputData));

    const config = this.getAxiosConfig();
    config.headers = {
      ...formData.getHeaders(),
    };
    try {
      const { data } = await axios.post(this.BASE_URI + "/v1/identity-documents/verifications", formData, config);
      return data.id;
    } catch (e) {
      this.logger.error(`Sardine request failed for Document submit: ${JSON.stringify(e)}`);
      if (e.response) {
        if (e.response.status === 400) {
          return e.response.data.verification_id;
        } else if (e.response.status == 422) {
          this.logger.error(`Sardine request failed for document verification: ${JSON.stringify(e.response.data)}`);
          throw new BadRequestException(`${JSON.stringify(e.response.data)}`);
        }
      }
      throw new BadRequestException(e.message);
    }
  }

  async getDocumentVerificationResult(id: string): Promise<DocumentVerificationResult> {
    try {
      const config = this.getAxiosConfig();

      const { data } = await axios.get(this.BASE_URI + "/v1/identity-documents/verifications/" + id, {
        ...config,
        params: {
          type: "custom",
        },
      });
      return this.processDocumentVerificationResult(data as DocumentVerificationSardineResponse);
    } catch (e) {
      if (e.response?.status == 422) {
        this.logger.error(
          `Sardine request failed to get document verification result: ${JSON.stringify(e.response.data)}`,
        );
        throw new BadRequestException(`${JSON.stringify(e.response.data)}`);
      } else {
        this.logger.error("Sardine request failed to get document verification, returning not found");
        throw new NotFoundException();
      }
    }
  }

  async getIdentityDocumentVerificationURL(
    sessionKey: string,
    consumer: Consumer,
    locale: IDVerificationURLRequestLocale,
    idBack: boolean,
    selfie: boolean,
    poa: boolean,
  ): Promise<IdentityDocumentURLResponse> {
    try {
      const requestData: IdentityDocumentURLRequest = {
        sessionKey: sessionKey,
        customerId: consumer.props.id,
        idback: idBack,
        selfie: selfie,
        poa: poa,
        locale: locale,
        inputData: {
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          address: {
            street1: consumer.props.address.streetLine1,
            city: consumer.props.address.city,
            region: consumer.props.address.regionCode,
            postalCode: consumer.props.address.postalCode,
            countryCode: consumer.props.address.countryCode,
          },
        },
      };

      const { data } = await axios.post(
        this.BASE_URI + "/v1/identity-documents/urls",
        requestData,
        this.getAxiosConfig(),
      );
      return data as IdentityDocumentURLResponse;
    } catch (e) {
      if (e.response?.status == 422) {
        this.logger.error(`Sardine request failed to get identity document URL: ${JSON.stringify(e.response.data)}`);
        throw new BadRequestException(`${JSON.stringify(e.response.data)}`);
      } else throw new InternalServerErrorException("Unable to retrieve URL at this time");
    }
  }

  async transactionVerification(
    sessionKey: string,
    consumer: Consumer,
    transaction: TransactionVerification,
  ): Promise<ConsumerVerificationResult> {
    let debitConsumer: Consumer;
    let creditConsumer: Consumer;
    let debitSidePaymentMethod: PaymentMethod;
    let creditSidePaymentMethod: PaymentMethod;
    let actionType: string;

    // Populate "other" section with user's Circle wallet ID
    const circleWallet = await this.circleService.getOrCreateWallet(consumer.props.id);
    const consumerPaymentMethod: PaymentMethod = {
      type: PaymentMethodTypes.OTHER,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      billingAddress: this.convertConsumerAddressToSardine(consumer),
      other: {
        id: circleWallet,
        type: "Circle",
      },
    };

    switch (transaction.workflowName) {
      // For transfers and withdrawals, the initiator is always the debit consumer
      case WorkflowName.WALLET_TRANSFER:
        actionType = "transfer";
        debitConsumer = consumer;
        creditConsumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
        debitSidePaymentMethod = consumerPaymentMethod; // For a transfer, set sender to the circle wallet
        const recipientCircleWallet = await this.circleService.getOrCreateWallet(transaction.creditConsumerID);
        creditSidePaymentMethod = {
          type: PaymentMethodTypes.OTHER,
          firstName: creditConsumer.props.firstName,
          lastName: creditConsumer.props.lastName,
          billingAddress: this.convertConsumerAddressToSardine(creditConsumer),
          other: {
            id: recipientCircleWallet,
            type: "Circle",
          },
        };
        break;
      case WorkflowName.WALLET_WITHDRAWAL:
        actionType = "withdraw";
        debitConsumer = consumer;
        creditConsumer = consumer;
        debitSidePaymentMethod = consumerPaymentMethod; // For a withdrawal, set sender to the circle wallet
        creditSidePaymentMethod = {
          type: PaymentMethodTypes.BANK,
          firstName: creditConsumer.props.firstName,
          lastName: creditConsumer.props.lastName,
          billingAddress: this.convertConsumerAddressToSardine(creditConsumer),
          bank: {
            accountNumber: transaction.withdrawalDetails?.accountNumber,
            routingNumber: transaction.withdrawalDetails?.bankCode,
            ...(transaction.withdrawalDetails?.accountType && {
              accountType: this.convertAccountTypeToSardine(transaction.withdrawalDetails.accountType),
            }),
            balanceCurrencyCode: transaction.creditCurrency,
            classification: "personal", // Currently the case for all withdrawals but this may change
            transferType: "ACH", // Currently the case for all withdrawals but this may change
          },
        };
        break;
      case WorkflowName.WALLET_DEPOSIT: // For deposits, the initiator is always the credit consumer
        actionType = "deposit";
        debitConsumer = consumer;
        creditConsumer = consumer;
        creditSidePaymentMethod = consumerPaymentMethod; // For a deposit, set recipient to the circle wallet
        debitSidePaymentMethod = {
          type: PaymentMethodTypes.BANK,
          firstName: creditConsumer.props.firstName,
          lastName: creditConsumer.props.lastName,
          billingAddress: this.convertConsumerAddressToSardine(creditConsumer),
          // We don't know anything about the actual bank account
          bank: {
            classification: "personal", // Currently the case for all deposits but this may change
            transferType: "ACH", // Currently the case for all deposits but this may change
          },
        };
        break;
      default:
        // This should never happen
        this.logger.error(`Unknown workflow name: ${transaction.workflowName}`);
        throw new Error(`Unknown workflow name: ${transaction.workflowName}`);
    }

    const sender: Customer = {
      ...this.convertConsumerToSardineCustomer(debitConsumer),
      ...(debitSidePaymentMethod && { paymentMethod: debitSidePaymentMethod }),
    };

    const recipient: Recipient = {
      id: creditConsumer.props.id,
      firstName: creditConsumer.props.firstName,
      lastName: creditConsumer.props.lastName,
      emailAddress: creditConsumer.props.email,
      address: this.convertConsumerAddressToSardine(creditConsumer),
      phone: creditConsumer.props.phone,
      dateOfBirth: creditConsumer.props.dateOfBirth,
      type: CustomerType.CUSTOMER,
      isKycVerified: creditConsumer.props.verificationData.kycCheckStatus === KYCStatus.APPROVED,
      ...(creditSidePaymentMethod && { paymentMethod: creditSidePaymentMethod }),
      ...(transaction.withdrawalDetails && {
        idDocument: {
          type: this.convertDocumentTypeToSardine(transaction.withdrawalDetails.documentType),
          number: transaction.withdrawalDetails.documentNumber,
          country: transaction.withdrawalDetails.country,
        },
      }),
    };

    // Take amount from the USD side of the transaction
    const usdAmount = transaction.creditCurrency == Currency.USD ? transaction.creditAmount : transaction.debitAmount;

    const sanctionsCheckSardineRequest: SardineCustomerRequest = {
      flow: transaction.workflowName,
      sessionKey: sessionKey,
      customer: sender,
      transaction: {
        id: transaction.transactionRef,
        status: "accepted",
        createdAtMillis: Date.now(),
        amount: Utils.roundTo2DecimalNumber(usdAmount),
        currencyCode: Currency.USD,
        actionType: actionType,
        ...(debitSidePaymentMethod && { paymentMethod: debitSidePaymentMethod }),
        recipient: recipient,
      },
      checkpoints: ["aml", "customer"],
    };

    try {
      const { data } = await axios.post(
        this.BASE_URI + "/v1/customers",
        sanctionsCheckSardineRequest,
        this.getAxiosConfig(),
      );

      let verificationStatus: KYCStatus = KYCStatus.REJECTED;

      if (data.level === SardineRiskLevels.VERY_HIGH) {
        verificationStatus = KYCStatus.REJECTED;
      } else if (data.level === SardineRiskLevels.HIGH) {
        verificationStatus = KYCStatus.PENDING;
      } else {
        verificationStatus = KYCStatus.APPROVED;
      }

      return {
        status: verificationStatus,
        idvProviderRiskLevel: data.level,
      };
    } catch (e) {
      if (e.response?.status == 422) {
        this.logger.error(`Sardine request failed for Transaction validation: ${JSON.stringify(e.response.data)}`);
        throw new BadRequestException(`${JSON.stringify(e.response.data)}`);
      } else throw new BadRequestException(e);
    }
  }

  async getDeviceVerificationResult(sessionKey: string): Promise<SardineDeviceInformationResponse> {
    try {
      const payload = {
        sessionKey: sessionKey,
        checkpoints: ["device"],
      };

      const { data }: { data: SardineDeviceInformationResponse } = await axios.post(
        this.BASE_URI + "/v2/devices",
        payload,
        this.getAxiosConfig(),
      );
      return data;
    } catch (e) {
      if (e.response?.status == 422) {
        this.logger.error(
          `Sardine request failed to get device verification result: ${JSON.stringify(e.response.data)}`,
        );
        throw new BadRequestException(`${JSON.stringify(e.response.data)}`);
      } else {
        this.logger.error(`Sardine request failed for get device verification result: ${e}`);
        throw new NotFoundException(e.message);
      }
    }
  }

  processDocumentVerificationResult(
    documentVerificationSardineResponse: DocumentVerificationSardineResponse,
  ): DocumentVerificationResult {
    const riskLevel: SardineRiskLevels = documentVerificationSardineResponse.verification?.riskLevel;
    const status: SardineDocumentProcessingStatus = documentVerificationSardineResponse.status;
    const errorCodes: DocumentVerificationErrorCodes[] = documentVerificationSardineResponse.errorCodes;

    switch (status) {
      case SardineDocumentProcessingStatus.PENDING:
        return {
          status: DocumentVerificationStatus.PENDING,
          riskRating: riskLevel,
        };

      case SardineDocumentProcessingStatus.PROCESSING:
        return {
          status: DocumentVerificationStatus.PENDING,
          riskRating: riskLevel,
        };

      case SardineDocumentProcessingStatus.COMPLETE:
        switch (riskLevel) {
          case SardineRiskLevels.UNKNOWN:
            return {
              status: DocumentVerificationStatus.PENDING,
              riskRating: riskLevel,
            };

          case SardineRiskLevels.HIGH:
            return {
              status: DocumentVerificationStatus.PENDING,
              riskRating: riskLevel,
            };

          case SardineRiskLevels.MEDIUM:
            return {
              status: DocumentVerificationStatus.APPROVED,
              riskRating: riskLevel,
            };

          case SardineRiskLevels.LOW:
            return {
              status: DocumentVerificationStatus.APPROVED,
              riskRating: riskLevel,
            };

          default:
            this.logger.error(
              `Unexpected Sardine DocumentVerification Response: "${JSON.stringify(
                documentVerificationSardineResponse,
              )}"`,
            );
            throw new InternalServerErrorException();
        }

      case SardineDocumentProcessingStatus.ERROR:
        if (errorCodes.length > 0) {
          switch (errorCodes[0]) {
            case DocumentVerificationErrorCodes.DOCUMENT_UNRECOGNIZABLE:
              return {
                status: DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY,
                riskRating: riskLevel,
              };

            case DocumentVerificationErrorCodes.DOCUMENT_BAD_SIZE_OR_TYPE:
              return {
                status: DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE,
                riskRating: riskLevel,
              };

            case DocumentVerificationErrorCodes.DOCUMENT_REQUIRES_RECAPTURE:
              return {
                status: DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE,
                riskRating: riskLevel,
              };

            default:
              this.logger.error(
                `Unexpected Sardine DocumentVerification Response: "${JSON.stringify(
                  documentVerificationSardineResponse,
                )}"`,
              );
              throw new InternalServerErrorException();
          }
        } else {
          this.logger.error(
            `Unexpected Sardine DocumentVerification Response: "${JSON.stringify(
              documentVerificationSardineResponse,
            )}"`,
          );
          throw new InternalServerErrorException();
        }

      case SardineDocumentProcessingStatus.REJECTED:
        return {
          status: DocumentVerificationStatus.REJECTED,
          riskRating: riskLevel,
        };

      default:
        this.logger.error(
          `Unexpected Sardine DocumentVerification Response: "${JSON.stringify(documentVerificationSardineResponse)}"`,
        );
        return {
          status: DocumentVerificationStatus.PENDING,
          riskRating: riskLevel,
        };
    }
  }

  processKycVerificationWebhookResult(resultData: CaseNotificationWebhookRequest): ConsumerVerificationResult {
    const { data } = resultData;
    if (data.case.status === CaseStatus.RESOLVED) {
      if (data.action.value === CaseAction.APPROVE) {
        return {
          status: KYCStatus.APPROVED,
        };
      } else if (data.action.value === CaseAction.DECLINE) {
        return {
          status: KYCStatus.REJECTED,
        };
      }
    }
    return {
      status: KYCStatus.PENDING,
    };
  }

  async postConsumerFeedback(sessionKey: string, consumerID: string, status: KYCStatus) {
    const consumer = await this.consumerService.getConsumer(consumerID);
    try {
      const payload: FeedbackRequest = {
        sessionKey: sessionKey,
        customer: this.convertConsumerToSardineCustomer(consumer),
        feedback: {
          id: Utils.generateUUID(),
          type: FeedbackType.ONBOARDING,
          timeMillis: Date.now(),
          status: status === KYCStatus.APPROVED ? FeedbackStatus.APPROVED : FeedbackStatus.DECLINED,
        },
      };

      await axios.post(this.BASE_URI + "/v1/feedbacks", payload, this.getAxiosConfig());
    } catch (e) {
      if (e.response?.status == 422) {
        this.logger.error(`Sardine request failed to post consumer feedback: ${JSON.stringify(e.response.data)}`);
      } else {
        this.logger.error(`Sardine request failed for postConsumerFeedback: ${e}`);
      }
    }
  }

  async postDocumentFeedback(sessionKey: string, result: DocumentVerificationResult) {
    try {
      const payload: FeedbackRequest = {
        sessionKey: sessionKey,
        feedback: {
          id: Utils.generateUUID(),
          type: FeedbackType.ONBOARDING,
          timeMillis: Date.now(),
          status:
            result.status === DocumentVerificationStatus.APPROVED || DocumentVerificationStatus.LIVE_PHOTO_VERIFIED
              ? FeedbackStatus.APPROVED
              : FeedbackStatus.DECLINED,
        },
      };
      await axios.post(this.BASE_URI + "/v1/feedbacks", payload, this.getAxiosConfig());
    } catch (e) {
      if (e.response?.status == 422) {
        this.logger.error(`Sardine request failed to post document feedback: ${JSON.stringify(e.response.data)}`);
      } else {
        this.logger.error(`Sardine request failed for postDocumentFeedback: ${e}`);
      }
    }
  }

  async postTransactionFeedback(
    sessionKey: string,
    errorCode: string,
    errorDescription: string,
    transactionID: string,
    processor: string,
  ): Promise<void> {
    try {
      const payload: FeedbackRequest = {
        sessionKey: sessionKey,
        feedback: {
          id: transactionID,
          type: FeedbackType.AUTHORIZATION,
          timeMillis: Date.now(),
          status: FeedbackStatus.DECLINED,
          reason: errorCode,
          description: errorDescription,
          processor: processor,
        },
      };
      await axios.post(this.BASE_URI + "/v1/feedbacks", payload, this.getAxiosConfig());
    } catch (e) {
      if (e.response?.status == 422) {
        this.logger.error(`Sardine request failed to post transaction feedback: ${JSON.stringify(e.response.data)}`);
      } else {
        this.logger.error(`Sardine request failed for postTransactionFeedback: ${e}`);
      }
    }
  }

  private convertConsumerAddressToSardine(consumer: Consumer): Address {
    return {
      ...(consumer.props.address?.streetLine1 && { street1: consumer.props.address?.streetLine1 }),
      ...(consumer.props.address?.streetLine2 && { street2: consumer.props.address?.streetLine2 }),
      ...(consumer.props.address?.city && { city: consumer.props.address?.city }),
      ...(consumer.props.address?.regionCode && { regionCode: consumer.props.address?.regionCode }),
      ...(consumer.props.address?.postalCode && { postalCode: consumer.props.address?.postalCode }),
      ...(consumer.props.address?.countryCode && { countryCode: consumer.props.address?.countryCode }),
    };
  }

  private convertDocumentTypeToSardine(documentType: string): DocumentType {
    if (!documentType) return DocumentType.OTHER;

    // Note that we don't currently support driver's license as a named type
    // of identity. When we do, we need to map it here to DocumentType.DRIVERS_LICENSE
    if (documentType === "PASS") return DocumentType.PASSPORT;
    else return DocumentType.OTHER;
  }

  private convertAccountTypeToSardine(accountType: string): AccountType {
    if (!accountType) return AccountType.OTHER;

    // Note that we don't currently support driver's license as a named type
    // of identity. When we do, we need to map it here to DocumentType.DRIVERS_LICENSE
    if (accountType.toLowerCase().indexOf("checking") > -1) return AccountType.CHECKING;
    else if (accountType.toLowerCase().indexOf("savings") > -1) return AccountType.SAVINGS;
    else return AccountType.OTHER;
  }

  private convertConsumerToSardineCustomer(consumer: Consumer): Customer {
    return {
      id: consumer.props.id,
      createdAtMillis: consumer.props.createdTimestamp.getTime(),
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      emailAddress: consumer.props.email,
      address: this.convertConsumerAddressToSardine(consumer),
      phone: consumer.props.phone,
      dateOfBirth: consumer.props.dateOfBirth,
      type: CustomerType.CUSTOMER,
    };
  }
}
