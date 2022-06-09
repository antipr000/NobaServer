import axios, { AxiosRequestConfig } from 'axios';
import { ConfigService } from '@nestjs/config';
import { Consent, DocumentRequest, DocumentTypes, IDRequest, IDResponse, Status, Subdivision } from '../../definitions';
import { NationalIDTypes } from '../../definitions/NationalID';
import { TruliooDocRequest, TruliooDocResponse, TruliooRequest, TransactionStatus, TransactionStatusResponse } from './TruliooDefinitions';
import { configurations } from './Configurations';
import IDVIntegrator from '../../IDVIntegrator';
import { Injectable } from '@nestjs/common';
import { TruliooConfigs } from '../../../../config/configtypes/TruliooConfigs';
import { TRULIOO_CONFIG_KEY } from '../../../../config/ConfigurationUtils';

@Injectable()
export default class TruliooIntegrator extends IDVIntegrator {

    apiToken: string;
    docVerificationApiToken: string;

    constructor(configService: ConfigService) {
        super(configurations);
        this.apiToken = configService.get<TruliooConfigs>(TRULIOO_CONFIG_KEY).TruliooIDVApiKey;
        this.docVerificationApiToken = configService.get<TruliooConfigs>(TRULIOO_CONFIG_KEY).TruliooDocVApiKey;

        console.log("Trullio configured. Key=" + this.apiToken);
    }

    parseRequest(request: IDRequest): TruliooRequest {
        const requestData: TruliooRequest =  {
            AcceptTruliooTermsAndConditions: true,
            ConfigurationName: "Identity Verification",
            CountryCode: request.countryCode,
            DataFields: {
                PersonInfo: {
                    FirstGivenName: request.firstName,
                    FirstSurName: request.lastName,
                    DayOfBirth: request.dateOfBirth.date,
                    MonthOfBirth: request.dateOfBirth.month,
                    YearOfBirth: request.dateOfBirth.year
                },
                Location: {
                    StreetName: request.streetName,
                    City: request.city,
                    Country: request.countryCode,
                    PostalCode: request.postalCode,
                    StateProvinceCode: request.state
                }
            }
        };

        switch(request.nationalID.type) {
            case NationalIDTypes.DriverLicence:
                requestData.DataFields.DriverLicence = {
                    Number: request.nationalID.number,
                    State: request.nationalID.state,
                    DayOfExpiry: request.nationalID.dayOfExpiry,
                    MonthOfExpiry: request.nationalID.monthOfExpiry,
                    YearOfExpiry: request.nationalID.yearOfExpiry
                };
                break;
            case NationalIDTypes.Passport:
                requestData.DataFields.Passport = {
                    Number: request.nationalID.number,
                    Mrz1: request.nationalID.mrz1,
                    Mrz2: request.nationalID.mrz2,
                    DayOfExpiry: request.nationalID.dayOfExpiry,
                    MonthOfExpiry: request.nationalID.monthOfExpiry,
                    YearOfExpiry: request.nationalID.yearOfExpiry
                };
                break;
            case NationalIDTypes.HealthID:
                requestData.DataFields.NationalIds = [
                    {
                        Type: "healthid",
                        Number: request.nationalID.number
                    }
                ];
                break;
            case NationalIDTypes.NationalID:
                requestData.DataFields.NationalIds = [
                    {
                        Type: "nationalid",
                        Number: request.nationalID.number
                    }
                ];
                break;
            case NationalIDTypes.SocialService:
                requestData.DataFields.NationalIds = [
                    {
                        Type: "socialservice",
                        Number: request.nationalID.number
                    }
                ];
                break;
            default:
                throw Error("ID is not supported");
        }
        return requestData;
    }

    parseDocumentRequest(request: DocumentRequest): TruliooDocRequest {
        return {
            AcceptTruliooTermsAndConditions: true,
            CallBackUrl: configurations.CALLBACK_URL,
            CountryCode: request.countryCode,
            ConfigurationName: "Identity Verification",
            DataFields: {
                Document: {
                    DocumentFrontImage: request.documentFrontImage,
                    DocumentBackImage: request.documentBackImage,
                    DocumentType: request.documentType
                }
            }
        };
    }

    parseConsent(consent: any): Consent {
        return {
            name: consent.Name,
            message: consent.Text
        };
    }

    parseCountrySubdivision(subdivision: any): Subdivision {
        return {
            name: subdivision.Name,
            code: subdivision.Code
        };
    }

    parseResponse(response: any, userID: string): IDResponse {
        if (response["Record"]["RecordStatus"] === "match") {
            return {
                status: Status.OK
            };
        }

        return {
            status: Status.FAILED
        };
    }
    getAxiosConfig(): AxiosRequestConfig {
        return {
            headers: {
                'Authorization': 'Basic ' + this.apiToken
            }
        };
    }

    getAxiosConfigForDocumentVerification(): AxiosRequestConfig {
        return {
            headers: {
                'Authorization': 'Basic ' + this.docVerificationApiToken
            }
        };
    }

    transactionStatusMapper(transactionStatus: string): TransactionStatus {
        switch(transactionStatus) {
            case "Completed":
                return TransactionStatus.Completed;
            case "Failed":
                return TransactionStatus.Failed;
            case "Canceled":
                return TransactionStatus.Canceled;
            case "TimeoutCanceled":
                return TransactionStatus.TimeoutCanceled;
            default:
                return TransactionStatus.InProgress;
        }
    }

    async getTransactionStatus(transactionID: string): Promise<TransactionStatusResponse> {
        console.log(transactionID);
        const { data } = await axios.get(
            configurations.GET_TRANSACTION_STATUS + transactionID + "/status", 
            this.getAxiosConfigForDocumentVerification());
        return {
            TransactionId: transactionID,
            TransactionRecordId: data["TransactionRecordId"],
            UploadedDt: data["UploadedDt"],
            IsTimedOut: data["isTimedOut"],
            Status: this.transactionStatusMapper(data["Status"])
        }
    }

    async getTransactionResult(transactionRecordId: string): Promise<boolean> {
        const { data } = await axios.get(
            configurations.GET_TRANSACTION_RECORD + transactionRecordId,
            this.getAxiosConfigForDocumentVerification()
        );
        if(data["Record"]["RecordStatus"] === "match") return true;
        return false;
    }

    async parseDocumentResponse(response: TruliooDocResponse): Promise<string> {
        const transactionId: string = response.TransactionID;
        return transactionId;
    }

}