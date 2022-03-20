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

    @Post("/id")
    @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO })
    async verifyUser(@Body() request: IDVerificationRequestDTO): Promise<IDResponse> {
        return this.idvProvider.verify(request);
	}
}