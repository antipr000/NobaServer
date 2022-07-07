import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import axios, { AxiosRequestConfig } from "axios";
import { ConsumerVerificationStatus, DocumentVerificationStatus } from "../../consumer/domain/VerificationStatus";
import { SardineConfigs } from "../../../config/configtypes/SardineConfigs";
import { SARDINE_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { ConsumerInformation } from "../domain/ConsumerInformation";
import { DocumentInformation } from "../domain/DocumentInformation";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { IDVProvider } from "./IDVProvider";
import {
  PaymentMethodTypes,
  SardineCustomerRequest,
  SardineDocumentProcessingStatus,
  SardineRiskLevels,
} from "./SardineTypeDefinitions";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import * as FormData from "form-data";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { TransactionInformation } from "../domain/TransactionInformation";

@Injectable()
export class Sardine implements IDVProvider {
  BASE_URI: string;
  constructor(private readonly configService: CustomConfigService) {
    // this.BASE_URI = configService.get<SardineConfigs>(SARDINE_CONFIG_KEY).sardineBaseUri;
    // TODO: Figure out why its undefined when reading from config service and remove hardcoding
    this.BASE_URI = "https://api.dev.sardine.ai";
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
    try {
      console.log(this.BASE_URI);
      const { data } = await axios.post(this.BASE_URI + "/v1/customers", sardineRequest, this.getAxiosConfig());
      if (data.level === SardineRiskLevels.VERY_HIGH || data.level === SardineRiskLevels.HIGH) {
        return {
          status: ConsumerVerificationStatus.NOT_APPROVED_REJECTED_KYC,
        };
      } else if (data.level === SardineRiskLevels.MEDIUM) {
        return {
          status: ConsumerVerificationStatus.PENDING_FLAGGED_KYC,
        };
      } else {
        return {
          status: ConsumerVerificationStatus.PENDING_KYC_APPROVED,
        };
      }
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
  async verifyDocument(sessionKey: string, documentInfo: DocumentInformation): Promise<string> {
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

    const config = this.getAxiosConfig();
    config.headers = {
      ...formData.getHeaders(),
    };
    try {
      const { data } = await axios.post(this.BASE_URI + "/v1/identity-documents/verifications", formData, config);
      return data.id;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getDocumentVerificationResult(
    sessionKey: string,
    id: string,
    userID: string,
  ): Promise<DocumentVerificationResult> {
    try {
      const config = this.getAxiosConfig();

      const { data } = await axios.get(this.BASE_URI + "/v1/identity-documents/verifications/" + id, {
        ...config,
        params: {
          type: "custom",
          sessionKey: sessionKey,
          customerId: userID,
        },
      });
      if (data.status === SardineDocumentProcessingStatus.PENDING) {
        return {
          status: DocumentVerificationStatus.PENDING,
        };
      } else if (data.status === SardineDocumentProcessingStatus.PROCESSING) {
        return {
          status: DocumentVerificationStatus.PENDING,
        };
      } else if (data.status === SardineDocumentProcessingStatus.COMPLETE) {
        // TODO: Add logic for differentiating between VERIFIED and LIVE_PHOTO_VERIFIED
        return {
          status: DocumentVerificationStatus.VERIFIED,
        };
      } else {
        return {
          status: DocumentVerificationStatus.REJECTED,
        };
      }
    } catch (e) {
      console.log(e);
      throw new NotFoundException();
    }
  }

  async transactionVerification(
    sessionKey: string,
    consumer: Consumer,
    transactionInformation: TransactionInformation,
  ): Promise<ConsumerVerificationResult> {
    const sanctionsCheckSardineRequest: SardineCustomerRequest = {
      flow: "payment-submission",
      sessionKey: sessionKey,
      customer: {
        id: consumer.props._id,
      },
      transaction: {
        id: transactionInformation.transactionID,
        status: "accepted",
        createdAtMillis: new Date().getTime(),
        amount: transactionInformation.amount,
        currencyCode: transactionInformation.currencyCode,
        actionType: "buy",
        paymentMethod: {
          type: PaymentMethodTypes.CARD,
          card: {
            first6: `${transactionInformation.first6DigitsOfCard}`,
            last4: `${transactionInformation.last4DigitsOfCard}`,
            hash: transactionInformation.cardID,
          },
        },
        recipient: {
          emailAddress: consumer.props.email,
          isKycVerified:
            consumer.props.verificationData.kycVerificationStatus === ConsumerVerificationStatus.APPROVED ||
            consumer.props.verificationData.kycVerificationStatus === ConsumerVerificationStatus.PENDING_KYC_APPROVED,
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
      // TODO: Identify how to differentiate between RejectedFraud and RejectedWallet
      if (data.level === SardineRiskLevels.VERY_HIGH || data.level === SardineRiskLevels.HIGH) {
        return {
          status: ConsumerVerificationStatus.NOT_APPROVED_REJECTED_FRAUD,
        };
      } else if (data.level === SardineRiskLevels.MEDIUM) {
        return {
          status: ConsumerVerificationStatus.PENDING_FLAGGED_FRAUD,
        };
      } else {
        return {
          status: ConsumerVerificationStatus.APPROVED,
        };
      }
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
