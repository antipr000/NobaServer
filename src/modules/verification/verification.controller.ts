import { Controller, Get, Inject, Param, Body, Post, Put, HttpStatus, Response } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import IDVIntegrator from '../../externalclients/idvproviders/IDVIntegrator';
import TruliooIntegrator from '../../externalclients/idvproviders/providers/trulioo/TruliooIntegrator';
import { IDResponse, IDRequest } from '../../externalclients/idvproviders/definitions';
import { VerificationResultDTO } from './dto/VerificationResultDTO';
import { IDVerificationRequestDTO } from './dto/IDVerificationRequestDTO';
import { Logger } from 'winston';
import { ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ConsentDTO } from './dto/ConsentDTO';
import { SubdivisionDTO } from './dto/SubdivisionDTO';


@Controller("verify")
export class VerificationController {

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;

    idvProvider: IDVIntegrator;

    constructor(private readonly verificationService: VerificationService, private readonly configService: ConfigService) {
        this.idvProvider = new TruliooIntegrator();
    }


    @Get("/")
    @ApiResponse({ status: HttpStatus.OK, description: "Health check for verification service" })
    async getVerificationStatus(): Promise<string> {
        return "Hello Noba user. Verification seems to work fine!";
    }

    @Get("/countryCodes")
    @ApiResponse({ status: HttpStatus.OK, description: "Get country codes for supported countries" })
    async getCountryCodes(): Promise<Array<string>> {
        return this.idvProvider.getCountryCodes();
    }

    @Get("/consents/:countryCode")
    @ApiResponse({ status: HttpStatus.OK, type: [ConsentDTO] })
    async getConsents(@Param('countryCode') countryCode: string): Promise<Array<ConsentDTO>> {
        return this.idvProvider.getConsents(countryCode);
    }

    @Get("/subdivisions/:countryCode")
    @ApiResponse({ status: HttpStatus.OK, type: [SubdivisionDTO] })
    async getSubdivisions(@Param('countryCode') countryCode: string): Promise<Array<SubdivisionDTO>> {
        return this.idvProvider.getCountrySubdivisions(countryCode);
    }

    @Post("/id")
    @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO })
    async verifyUser(@Body() request: IDVerificationRequestDTO): Promise<VerificationResultDTO> {
        return this.idvProvider.verify(request);
	}
}