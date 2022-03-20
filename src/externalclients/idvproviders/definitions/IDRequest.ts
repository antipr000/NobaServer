import { NationalID } from './NationalID';
import { DOB } from './DOB';

export type IDRequest = {
    firstName: string;
    lastName: string;
    dateOfBirth: DOB;
    streetName: string;
    city: string;
    state: string;
    countryCode: string;
    postalCode: string;
    nationalID: NationalID;
};