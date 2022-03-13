import { ItemNotFoundException } from "@aws/dynamodb-data-mapper";
import { HttpStatus, HttpException } from '@nestjs/common';
import * as Joi from "joi";
import { AppExceptionCode, ApplicationException, BadRequestError } from './CommonAppException';


export function convertToHTTPException(exception: any): HttpException{
    if(exception instanceof ItemNotFoundException || exception.name === 'ItemNotFoundException'){
        return ApplicationException.dbItemNotFoundHTTPException(); 
    }

    if(Joi.isError(exception)) {
        return new BadRequestError({
            message: exception.message,
            clientExceptionCode : AppExceptionCode.INVALID_INPUT,
            messageForClient: exception.message
        }).toHTTPException();
    }
    
    if(exception instanceof HttpException) return exception; //TODO can something leak here? I guess when this app calls some other service and if that service throws HTTPException with sensitive information
    
    if(exception instanceof ApplicationException){
        return exception.toHTTPException();
    }

    //We return 500, if the exception is not known i.e. we don't leak sensitive information to outside world
    return new HttpException("Internal Noba Server Error.", HttpStatus.INTERNAL_SERVER_ERROR);
}

export function isApplicationException(exception) {
    return exception instanceof ApplicationException; 
}