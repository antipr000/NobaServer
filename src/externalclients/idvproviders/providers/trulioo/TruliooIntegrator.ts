import { AxiosRequestConfig } from 'axios';
import { IDRequest, IDResponse, Status } from '../../definitions';
import { TruliooRequest } from './TruliooDefinitions';
import IDVIntegrator from '../../IDVIntegrator';

const VERIFY_URL = "https://api.globaldatacompany.com/verifications/v1/verify";

export default class TruliooIntegrator extends IDVIntegrator {

    apiToken: string;

    constructor() {
        super(VERIFY_URL);
        this.apiToken = process.env.TruliooApiKey;
        console.log("Trullio configured. Key=" + this.apiToken);
    }

    parseRequest(request: IDRequest): TruliooRequest {
        return {
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
                },
                NationalIds: [
                    {
                        Number: request.nationalID.number,
                        Type: request.nationalID.type
                    }
                ]
            }
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