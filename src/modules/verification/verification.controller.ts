import { Controller, Get, Inject, Param, Body, Post, HttpStatus, Request, UseInterceptors, UploadedFiles, Req } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VerificationService } from './verification.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import IDVIntegrator from '../../externalclients/idvproviders/IDVIntegrator';
import TruliooIntegrator from '../../externalclients/idvproviders/providers/trulioo/TruliooIntegrator';
import { VerificationResultDTO } from './dto/VerificationResultDTO';
import { IDVerificationRequestDTO } from './dto/IDVerificationRequestDTO';
import { Logger } from 'winston';
import { ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ConsentDTO } from './dto/ConsentDTO';
import { SubdivisionDTO } from './dto/SubdivisionDTO';
import { DocVerificationRequestDTO } from './dto/DocVerificationRequestDTO';
import { Roles, UserID } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { Status } from '../../externalclients/idvproviders/definitions';
import { VerificationStatusDTO } from './dto/VerificationStatusDTO';
import { User } from '../auth/domain/User';
import { UserService } from '../user/user.service';
import { ApiBearerAuth } from '@nestjs/swagger';


@Roles(Role.User)
@ApiBearerAuth()
@Controller("verify")
export class VerificationController {

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;

    idvProvider: IDVIntegrator;

    constructor(
        private readonly verificationService: VerificationService, 
        private readonly userService: UserService,
        private readonly configService: ConfigService) {
        this.idvProvider = new TruliooIntegrator(configService);
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

    @Post(`/:${UserID}` + "/id")
    @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO })
    async verifyUser(@Param(UserID) id: string, 
                    @Body() requestBody: IDVerificationRequestDTO,
                    @Request() request): Promise<VerificationResultDTO> {
        const result: VerificationResultDTO = await this.idvProvider.verify(id, requestBody);
        const user: User = request.user._doc;
        if(result.status === Status.OK) {
            await this.userService.updateUser({
                ...user,
                idVerified: true,
                idVerificationTimestamp: new Date().getTime(),
                dateOfBirth: requestBody.dateOfBirth,
                address: {
                    streetName: requestBody.streetName,
                    city: requestBody.city,
                    state: requestBody.state,
                    countryCode: requestBody.countryCode,
                    postalCode: requestBody.postalCode
                }
            });
        } else {
            await this.userService.updateUser({
                ...user,
                dateOfBirth: requestBody.dateOfBirth,
                address: {
                    streetName: requestBody.streetName,
                    city: requestBody.city,
                    state: requestBody.state,
                    countryCode: requestBody.countryCode,
                    postalCode: requestBody.postalCode
                }
            })
        }
        return result;
	}

    //TODO: Setting data type of request to DocVerificationRequestDTO throws error. Figure out why
    // TODO: Figure out type for files
    @Post(`/:${UserID}` + "/doc")
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'documentFrontImage', maxCount: 1 },
        { name: 'documentBackImage', maxCount: 1 },
        { name: 'livePhoto', maxCount: 1 }
    ]))
    @ApiResponse({ status: HttpStatus.ACCEPTED, type: VerificationResultDTO })
    async verifyDocument(@Param(UserID) id: string, @UploadedFiles() files, @Body() requestData, @Request() request): Promise<VerificationResultDTO> {
        const documentFrontImageb64 = files.documentFrontImage[0].buffer.toString('base64');
        const documentBackImageb64 = files.documentBackImage[0].buffer.toString('base64');
        const livePhotob64 = files.livePhoto[0].buffer.toString('base64');
        const transactionId = await this.idvProvider.verifyDocument(id, {
            documentFrontImage: documentFrontImageb64,
            documentBackImage: documentBackImageb64,
            livePhoto: livePhotob64,
            countryCode: requestData.countryCode,
            documentType: requestData.documentType
        });
        const user: User = request.user._doc;
        await this.userService.updateUser({
            ...user,
            documentVerificationTransactionId: transactionId,
            documentVerificationTimestamp: new Date().getTime()
        });
        return {
            status: Status.PENDING
        };
    }
    

    @Get(`/:${UserID}` + "/doc/status")
    @ApiResponse({ status: HttpStatus.OK, type: VerificationStatusDTO })
    async getDocumentVerificationStatus(@Param(UserID) id: string, @Request() request): Promise<VerificationStatusDTO> {
        console.log(request.user);
        const transactionID = request.user.documentVerificationTransactionId;
        return await this.idvProvider.getTransactionStatus(transactionID);
    }

    @Get(`/:${UserID}` + "/doc/result")
    @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO }) 
    async getDocumentVerificationResult(@Param(UserID) id: string, @Request() request): Promise<VerificationResultDTO> {
        const transactionID = request.user.documentVerificationTransactionId;
        const transactionStatus = await this.idvProvider.getTransactionStatus(transactionID);
        const transactionRecordId = transactionStatus.TransactionRecordId;
        const isMatch: boolean = await this.idvProvider.getTransactionResult(transactionRecordId);
        const user: User = request.user._doc;
        await this.userService.updateUser({
            ...user,
            documentVerified: isMatch
        });
        if(isMatch) {
            return {
                status: Status.OK
            };
        } else {
            return {
                status: Status.FAILED
            };
        }
    }
}