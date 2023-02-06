import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import axios, { AxiosRequestConfig } from "axios";
import { KYCStatus, DocumentVerificationStatus, WalletStatus } from "@prisma/client";
import { SardineConfigs } from "../../../config/configtypes/SardineConfigs";
import { SARDINE_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { ConsumerInformation } from "../domain/ConsumerInformation";
import { DocumentInformation } from "../domain/DocumentInformation";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { IDVProvider } from "./IDVProvider";
import {
  CaseAction,
  CaseNotificationWebhookRequest,
  CaseStatus,
  DocumentVerificationErrorCodes,
  DocumentVerificationSardineResponse,
  FeedbackRequest,
  FeedbackStatus,
  FeedbackType,
  IdentityDocumentURLRequest,
  IdentityDocumentURLResponse,
  PaymentMethod,
  PaymentMethodTypes,
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
import { PlaidClient } from "../../psp/plaid.client";
import { IDVerificationURLRequestLocale } from "../dto/IDVerificationRequestURLDTO";
import { ConsumerService } from "../../consumer/consumer.service";
import { WorkflowName } from "../../transaction/domain/Transaction";
import { Currency } from "../../transaction/domain/TransactionTypes";
import { TransactionVerification } from "../domain/TransactionVerification";
import { CircleService } from "../../psp/circle.service";
import { Utils } from "../../../core/utils/Utils";

@Injectable()
export class Sardine implements IDVProvider {
  private BASE_URI: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: CustomConfigService,
    private readonly plaidClient: PlaidClient,
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

  async verifyConsumerInformation(
    sessionKey: string,
    consumerInfo: ConsumerInformation,
  ): Promise<ConsumerVerificationResult> {
    const flowType = consumerInfo.address.countryCode.toLocaleLowerCase() === "us" ? "kyc-us" : "kyc-non-us";
    const sardineRequest: SardineCustomerRequest = {
      flow: flowType,
      sessionKey: sessionKey,
      customer: {
        id: consumerInfo.userID,
        createdAtMillis: consumerInfo.createdTimestampMillis,
        firstName: consumerInfo.firstName,
        lastName: consumerInfo.lastName,
        dateOfBirth: consumerInfo.dateOfBirth,
        address: {
          street1: consumerInfo.address.streetLine1,
          street2: consumerInfo.address.streetLine2,
          city: consumerInfo.address.city,
          regionCode: consumerInfo.address.regionCode,
          postalCode: consumerInfo.address.postalCode,
          countryCode: consumerInfo.address.countryCode,
        },
        emailAddress: consumerInfo.email,
        isEmailVerified: true,
      },
      checkpoints: ["customer"],
    };

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
        this.logger.error(`Sardine request failed to get document verification, returning not found`);
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
    // Populate "other" section with user's Circle wallet ID
    const circleWallet = await this.circleService.getOrCreateWallet(consumer.props.id);
    const consumerPaymentMethod: PaymentMethod = {
      type: PaymentMethodTypes.OTHER,
      other: {
        id: circleWallet,
        type: "Circle",
      },
    };

    let debitSidePaymentMethod: PaymentMethod;
    let creditSidePaymentMethod: PaymentMethod;

    // Take amount from the USD side of the transaction
    const usdAmount = transaction.creditCurrency == Currency.USD ? transaction.creditAmount : transaction.debitAmount;

    let actionType;
    let checkpoints = ["aml", "customer"];
    switch (transaction.workflowName) {
      case WorkflowName.WALLET_TRANSFER:
        actionType = "transfer";
        debitSidePaymentMethod = consumerPaymentMethod; // For a transfer, set sender to the circle wallet
        const recipientCircleWallet = await this.circleService.getOrCreateWallet(transaction.creditConsumerID);
        creditSidePaymentMethod = {
          type: PaymentMethodTypes.OTHER,
          other: {
            id: recipientCircleWallet,
            type: "Circle",
          },
        };
        break;
      case WorkflowName.WALLET_WITHDRAWAL:
        actionType = "withdraw";
        debitSidePaymentMethod = consumerPaymentMethod; // For a withdrawal, set sender to the circle wallet
        // TODO (CRYPTO-622): populate bank info here in creditSidePaymentMethod
        break;
      case WorkflowName.WALLET_DEPOSIT:
        actionType = "deposit";
        creditSidePaymentMethod = consumerPaymentMethod; // For a deposit, set recipient to the circle wallet
        checkpoints.push("ach");
        break;
      default:
        // This should never happen
        this.logger.error(`Unknown workflow name: ${transaction.workflowName}`);
        throw new Error(`Unknown workflow name: ${transaction.workflowName}`);
    }

    const sanctionsCheckSardineRequest: SardineCustomerRequest = {
      flow: transaction.workflowName,
      sessionKey: sessionKey,
      customer: {
        id: consumer.props.id,
      },
      transaction: {
        id: transaction.transactionID,
        status: "accepted",
        createdAtMillis: Date.now(),
        amount: usdAmount,
        currencyCode: Currency.USD,
        actionType: actionType,
        ...(debitSidePaymentMethod && { paymentMethod: debitSidePaymentMethod }),
        recipient: {
          emailAddress: consumer.props.email,
          isKycVerified: consumer.props.verificationData.kycCheckStatus === KYCStatus.APPROVED,
          ...(creditSidePaymentMethod && { paymentMethod: creditSidePaymentMethod }),
        },
      },
      checkpoints: checkpoints,
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

  /* Onramp version, for reference
  async transactionVerification(
    sessionKey: string,
    consumer: Consumer,
    transactionInformation: TransactionInformation,
  ): Promise<ConsumerVerificationResult> {
    let sardinePaymentMethodData;
    const allPaymentMethods = await this.consumerService.getAllPaymentMethodsForConsumer(consumer.props.id);
    const paymentMethod = allPaymentMethods.filter(
      paymentMethod => paymentMethod.props.id === transactionInformation.paymentMethodID,
    )[0];
    if (paymentMethod.props.type === PaymentMethodType.CARD) {
      sardinePaymentMethodData = {
        type: PaymentMethodTypes.CARD,
        card: {
          first6: paymentMethod.props.cardData.first6Digits,
          last4: paymentMethod.props.cardData.last4Digits,
          hash: transactionInformation.paymentMethodID,
        },
      };
    } else if (paymentMethod.props.type === PaymentMethodType.ACH) {
      const accountData: RetrieveAccountDataResponse = await this.plaidClient.retrieveAccountData({
        accessToken: paymentMethod.props.achData.accessToken,
      });

      let accountType = "";
      switch (accountData.accountType) {
        case BankAccountType.CHECKING:
          accountType = "checking";
          break;

        case BankAccountType.SAVINGS:
          accountType = "savings";
          break;

        default:
          accountType = "other";
      }

      sardinePaymentMethodData = {
        type: PaymentMethodTypes.BANK,
        bank: {
          accountNumber: accountData.accountNumber,
          routingNumber: accountData.achRoutingNumber,
          accountType: accountType,
          balance: parseFloat(accountData.availableBalance),
          balanceCurrencyCode: accountData.currencyCode,
          id: accountData.institutionID,
          idSource: "plaid",
        },
      };
    }
    else (paymentMethod.props.type === PaymentMethodType.)

    const sanctionsCheckSardineRequest: SardineCustomerRequest = {
      flow: "payment-submission",
      sessionKey: sessionKey,
      customer: {
        id: consumer.props.id,
      },
      transaction: {
        id: transactionInformation.transactionID,
        status: "accepted",
        createdAtMillis: Date.now(),
        amount: transactionInformation.amount,
        currencyCode: transactionInformation.currencyCode,
        actionType: "buy",
        paymentMethod: sardinePaymentMethodData,
        recipient: {
          emailAddress: consumer.props.email,
          isKycVerified: consumer.props.verificationData.kycCheckStatus === KYCStatus.APPROVED,
          paymentMethod: {
            type: PaymentMethodTypes.CRYPTO,
            crypto: {
              currencyCode: transactionInformation.cryptoCurrencyCode,
              address: transactionInformation.walletAddress,
            },
          },
        },
      },
      checkpoints: ["aml", "payment"],
    };

    try {
      const { data } = await axios.post(
        this.BASE_URI + "/v1/customers",
        sanctionsCheckSardineRequest,
        this.getAxiosConfig(),
      );

      let walletStatus: WalletStatus = transactionInformation.walletStatus;
      let verificationStatus: KYCStatus = KYCStatus.REJECTED;

      for (const signal of data["customer"]["signals"]) {
        if (signal["key"] === "cryptoAddressLevel") {
          signal["value"] === SardineRiskLevels.HIGH
            ? (walletStatus = WalletStatus.REJECTED)
            : (walletStatus = WalletStatus.APPROVED);
        }
      }

      if (data.level === SardineRiskLevels.VERY_HIGH) {
        verificationStatus = KYCStatus.REJECTED;
      } else if (data.level === SardineRiskLevels.HIGH) {
        verificationStatus = KYCStatus.PENDING;
      } else {
        verificationStatus = KYCStatus.APPROVED;
      }

      return {
        walletStatus: walletStatus,
        status: verificationStatus,
        idvProviderRiskLevel: data.level,
      };
    } catch (e) {
      this.logger.error(`Sardine request failed for Transaction validation: ${e}`);
      throw new BadRequestException(e.message);
    }
  }*/

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

  async postConsumerFeedback(sessionKey: string, result: ConsumerVerificationResult) {
    try {
      const payload: FeedbackRequest = {
        sessionKey: sessionKey,
        feedback: {
          id: Utils.generateUUID(),
          type: FeedbackType.ONBOARDING,
          timeMillis: Date.now(),
          status: result.status === KYCStatus.APPROVED ? FeedbackStatus.APPROVED : FeedbackStatus.DECLINED,
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
}