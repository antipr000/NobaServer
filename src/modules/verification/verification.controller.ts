import { Body, Controller, Get, HttpStatus, Inject, Param, Post, Request, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Status } from '../../externalclients/idvproviders/definitions';
import IDVIntegrator from '../../externalclients/idvproviders/IDVIntegrator';
import TruliooIntegrator from '../../externalclients/idvproviders/providers/trulioo/TruliooIntegrator';
import { User } from '../auth/domain/User';
import { Role } from '../auth/role.enum';
import { Roles, UserID } from '../auth/roles.decorator';
import { UserService } from '../user/user.service';
import { ConsentDTO } from './dto/ConsentDTO';
import { IDVerificationRequestDTO } from './dto/IDVerificationRequestDTO';
import { SubdivisionDTO } from './dto/SubdivisionDTO';
import { VerificationResultDTO } from './dto/VerificationResultDTO';
import { VerificationStatusDTO } from './dto/VerificationStatusDTO';
import { VerificationService } from './verification.service';


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
    @ApiOperation({ summary: 'Check if verification service is up' })
    @ApiResponse({ status: HttpStatus.OK, description: "Health check for verification service" })
    async getVerificationStatus(): Promise<string> {
        return "Hello Noba user. Verification seems to work fine!";
    }

    @Get("/countryCodes")
    @ApiOperation({ summary: 'Get list of country codes that Noba supports' })
    @ApiResponse({ status: HttpStatus.OK, description: "Get country codes for supported countries" })
    @ApiBadRequestResponse({ description: 'Invalid request parameters!' })
    async getCountryCodes(): Promise<Array<string>> {
        return this.idvProvider.getCountryCodes();
    }

    @Get("/consents/:countryCode")
    @ApiOperation({ summary: 'Get all consents for a given country code' })
    @ApiResponse({ status: HttpStatus.OK, type: [ConsentDTO], description: "Get all consents" })
    @ApiBadRequestResponse({ description: 'Invalid request parameters!' })
    async getConsents(@Param('countryCode') countryCode: string): Promise<Array<ConsentDTO>> {
        return this.idvProvider.getConsents(countryCode);
    }

    @Get("/subdivisions/:countryCode")
    @ApiOperation({ summary: 'Get subdivision for the given country code' })
    @ApiResponse({ status: HttpStatus.OK, type: [SubdivisionDTO], description: "Get subdivision for the given country code" })
    @ApiBadRequestResponse({ description: 'Invalid request parameters!' })
    async getSubdivisions(@Param('countryCode') countryCode: string): Promise<Array<SubdivisionDTO>> {
        return this.idvProvider.getCountrySubdivisions(countryCode);
    }

    @Post(`/:${UserID}` + "/id")
    @ApiOperation({ summary: 'Get verification result' })
    @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO, description: "Get verification result" })
    @ApiBadRequestResponse({ description: 'Invalid request parameters!' })
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
    @ApiOperation({ summary: 'Get verification result' })
    @ApiResponse({ status: HttpStatus.ACCEPTED, type: VerificationResultDTO , description: "Get verification result" })
    @ApiBadRequestResponse({ description: 'Invalid request parameters!' })
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
    @ApiOperation({ summary: 'Get KYC status of the given user' })
    @ApiResponse({ status: HttpStatus.OK, type: VerificationStatusDTO, description: "Get KYC status of the given user" })
    @ApiBadRequestResponse({ description: 'Invalid request parameters!' })
    async getDocumentVerificationStatus(@Param(UserID) id: string, @Request() request): Promise<VerificationStatusDTO> {
        console.log(request.user);
        const transactionID = request.user.documentVerificationTransactionId;
        return await this.idvProvider.getTransactionStatus(transactionID);
    }

    @Get(`/:${UserID}` + "/doc/result")
    @ApiOperation({ summary: 'Get KYC result of the given user' })
    @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO, description: "TODO Ask soham from usability perspective how is this any different than /status" }) 
    @ApiBadRequestResponse({ description: 'Invalid request parameters!' })
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
