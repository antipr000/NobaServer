import axios, { AxiosRequestConfig } from 'axios';
import { IDRequest, IDResponse } from './definitions';

export default abstract class IDVIntegrator {
    verifyUrl: string;

    constructor(verifyUrl: string) {
        this.verifyUrl = verifyUrl;
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

    /**
     * Method responsible for verifying an user against the provider.
     * Should do all heavy lifting like calling provider endpoints,
     * storing relevant information, some added validations etc.
     */
    async verify(request: IDRequest): Promise<IDResponse> {
        this.saveRequestInDB(request);
        const parsedRequest = this.parseRequest(request);
        const { data } = await axios.post(this.verifyUrl, parsedRequest, this.getAxiosConfig());
        const parsedResponse: IDResponse = this.parseResponse(data);
        this.saveResponseInDB(data, parsedResponse);
        return parsedResponse;
    }
}