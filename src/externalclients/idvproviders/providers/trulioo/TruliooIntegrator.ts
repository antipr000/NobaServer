import { AxiosRequestConfig } from 'axios';
import { Consent, IDRequest, IDResponse, Status, Subdivision } from '../../definitions';
import { NationalIDTypes } from '../../definitions/NationalID';
import { TruliooRequest } from './TruliooDefinitions';
import { configurations } from './Configurations';
import IDVIntegrator from '../../IDVIntegrator';

export default class TruliooIntegrator extends IDVIntegrator {

    apiToken: string;

    constructor() {
        super(configurations);
        this.apiToken = process.env.TruliooApiKey;
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
                    PostalCode: request.postalCode
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

    parseResponse(response: any): IDResponse {
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

}