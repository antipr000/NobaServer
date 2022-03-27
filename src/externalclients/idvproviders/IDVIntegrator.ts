import axios, { AxiosRequestConfig } from 'axios';
import { IDRequest, IDResponse, Consent, Subdivision } from './definitions';

export default abstract class IDVIntegrator {
    configuration: any

    constructor(configuration) {
        this.configuration = configuration;
    }

    private saveRequestInDB(request: IDRequest) {

    }

    private saveResponseInDB(respone: any, parsedResponse: IDResponse) {
      
    }

    // Convert request to integrator specific request data
    abstract parseRequest(request: IDRequest): any;

    // Convert integrator specific response data to a Response object
    abstract parseResponse(response: any): IDResponse;

    /* Get axios configuration for integrator. 
     * Mostly will be used for providing authentication headers to integrators */
    abstract getAxiosConfig(): AxiosRequestConfig;

    abstract parseConsent(consent: any): Consent;

    abstract parseCountrySubdivision(subdivision: any): Subdivision;

    // Returns list of all possible country codes supported by vendor
    async getCountryCodes(): Promise<Array<string>> {
        const { data } = await axios.get(this.configuration.COUNTRY_CODES_URL, this.getAxiosConfig());
        return data;
    }

    // Returns list of consents needed for the country to look into data sources
    async getConsents(countryCode: string): Promise<Array<Consent>> {
        const { data } = await axios.get(this.configuration.CONSENTS_URL + countryCode, this.getAxiosConfig());
        const consents: Array<Consent> = data.map(consent => this.parseConsent(consent));
        return consents;
    }

    // Returns list of subdivisions for a country
    async getCountrySubdivisions(countryCode: string): Promise<Array<Subdivision>> {
        const { data } = await axios.get(this.configuration.SUBDIVISIONS_URL + countryCode, this.getAxiosConfig());
        const subdivisions: Array<Subdivision> = data.map(subdivision => this.parseCountrySubdivision);
        return subdivisions;
    }

    /**
     * Method responsible for verifying an user against the provider.
     * Should do all heavy lifting like calling provider endpoints,
     * storing relevant information, some added validations etc.
     */
    async verify(request: IDRequest): Promise<IDResponse> {
        this.saveRequestInDB(request);
        const parsedRequest = this.parseRequest(request);
        const { data } = await axios.post(this.configuration.VERIFY_URL, parsedRequest, this.getAxiosConfig());
        const parsedResponse: IDResponse = this.parseResponse(data);
        this.saveResponseInDB(data, parsedResponse);
        return parsedResponse;
    }
}