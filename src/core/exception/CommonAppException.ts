import { HttpStatus, HttpException } from '@nestjs/common';
 
export enum AppExceptionCode { //TODO add more codes here
    EMAIL_ALREADY_EXISTS = "EmailAlreadyExists", 
    ITEM_NOT_FOUND_IN_DB = "ItemDoesNotExistsInDB",
    DUPLICATE_ITEM_EXCEPTION = "DuplicateItemsException",
    INVALID_INPUT="InvalidInput",
}

type AppExceptionHTTPResponseType = {
    message: string, //we don't report internal error message to client
    exceptionCodeForClient: string,
    clientResponseExceptionData: string, 
}

export type ApplicationExcpetionDetails = {
    error?: any
    message?: string, //this is not visible to client, if not set will default to messageForClient
    statusCode?: HttpStatus, 
    clientExceptionCode?: AppExceptionCode, 
    clientExceptionData?: any, 
    messageForClient?: string //this is visible to client, 
}

export class ApplicationException extends Error{
     name = "GenericApplicationException";

     httpStatusCode?: HttpStatus =  HttpStatus.INTERNAL_SERVER_ERROR; //default, should be overridden in specific type of exceptions
     public readonly exceptionCodeForClient? : AppExceptionCode; //View will render this to user according to user's language and rendering it with data provided in userMessageTemplateData
     public readonly clientResponseExceptionData?: any; //this will be sent in APIResponse so shouldn't contain sensitive information, this will be used to render exception in user's language
     public readonly messageForClient?: string;
     public severity = 10; //sev3, sev2, sev1, sev1 being highest severity, i.e. severity 10 (default) means no impact
     public readonly error?: any;
     public readonly messageForServer?: string;


     public constructor(options: ApplicationExcpetionDetails )//internal message for logging, this won't be sent to user
    { 
        super(options.message??options.messageForClient??"AppException without message this shouldn't happen, We should specify excpetion message !!!!");
        this.exceptionCodeForClient = options?.clientExceptionCode??this.exceptionCodeForClient
        this.clientResponseExceptionData = options?.clientExceptionData??this.clientResponseExceptionData;
        this.messageForClient = options?.messageForClient??this.messageForClient;  
        this.httpStatusCode = options?.statusCode??this.httpStatusCode;
        this.messageForServer = options.message?? options.messageForClient;
        this.error = options.error; 
    }

    public getHttpResponse():AppExceptionHTTPResponseType {
        return {
            message: this.name+":"+this.messageForClient??this.exceptionCodeForClient, //we don't report internal error message to client
            exceptionCodeForClient: this.exceptionCodeForClient,
            clientResponseExceptionData: this.clientResponseExceptionData?JSON.stringify(this.clientResponseExceptionData): "{}" 
        } 
    }

    public getHTTPStatusCode(): HttpStatus {
        return this.httpStatusCode; 
    }

    public toHTTPException() {
        return new HttpException(this.getHttpResponse(), this.getHTTPStatusCode());
    }

    public getDetailsForServer() : ApplicationExcpetionDetails {
        return  {
            error: this.error,
            message: this.message,
            messageForClient: this.messageForClient,
            clientExceptionData: this.clientResponseExceptionData,
            statusCode: this.httpStatusCode,
            clientExceptionCode: this.exceptionCodeForClient
        }
    }

    public getServerErrorString(): string {
        return JSON.stringify(this.getDetailsForServer());
    }

    public static dbItemNotFoundHTTPException() {
        const response: AppExceptionHTTPResponseType = {
            message: "ItemNotFound: "+AppExceptionCode.ITEM_NOT_FOUND_IN_DB,
            exceptionCodeForClient: AppExceptionCode.ITEM_NOT_FOUND_IN_DB,
            clientResponseExceptionData: "{}"
        }

        return new HttpException(response,HttpStatus.NOT_FOUND); 
    }


}

export class BadRequestError extends ApplicationException{ 
    public readonly name = "BadRequestError"; 
    public readonly httpStatusCode : HttpStatus =  HttpStatus.BAD_REQUEST; 
}

export class NotFoundError extends ApplicationException{ 
    public readonly name = "NotFoundError"; 
    public readonly httpStatusCode : HttpStatus =  HttpStatus.NOT_FOUND; 
}

export class DuplicateItemException extends ApplicationException {
    public readonly name = "DuplicateItemException"; 
    public readonly httpStatusCode : HttpStatus =  HttpStatus.INTERNAL_SERVER_ERROR; 
    public readonly severity = 1;//highest severity as this as duplicate item exception is expected in rare cases and needs to be resolved asap
    public readonly exceptionCodeForClient = AppExceptionCode.DUPLICATE_ITEM_EXCEPTION;
}
