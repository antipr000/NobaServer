import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { BadRequestError, AppExceptionCode } from '../exception/CommonAppException';

type ClassTypeToPropertiesMap =  { [key: string]: string[]; }

export class NoUnExpectedKeysValidationPipe implements PipeTransform<any> { //TODO we can make this pipe better by also doing validation for nested types but for now just checking root level keys is sufficient
    
    /* 
        typescript classes without prototype are like interfaces only, i.e. no information about the fields is available when they are compiled to javascript 
        e.g. 
        class UserDTO { name:string, age:number } will be compiled to just class UserDTO {}

        We need to make sure that we don't accept any keys other than the accepted typescript Type fields

        if we can make sure that the controller only gets the keys which are mentioned in the body Type then we can do things like below example.

        E.g. suppose we need to update user's basic info in an endpoint (email modifications shouldn't be allowed as part of this end point) 
        and we get input as UpdateUserBasicInfoType {name: string, age:number } 
        then we can do things like newUserDetails = {...existingUserDetails, ...updateUserBasicInfo} without worrying that api may be abused to modify email
        if we strip all the fields which are not defined in the body type of a controller in above example because UpdateUserBasicInfoType doesn't have 
        email field then the controller won't get email field because we will transform the received JSON to only have keys which are defined in the type 
        preventing undocumented/wrong use of the api

    */

   

    constructor (readonly classTypeToPropertiesMap: ClassTypeToPropertiesMap, readonly throwIfUnexpectedKeys:boolean = false) { // {UserDTO : ['name', 'email']}
        // console.log(`**********************ClassTypeToPropertiesMap***************************\n ${JSON.stringify(classTypeToPropertiesMap,null,1)}`); 
    }

    transform(apiRequestArgument, argumentMetaData: ArgumentMetadata) {
        if(argumentMetaData.type==='body') {//for now we only transform request's body to strip the fields which are not in controller's accepted body type
            const transformedArgument = {}; 
            const classType = argumentMetaData.metatype.name; 
            if(!this.classTypeToPropertiesMap[classType]){
                console.warn("Didn't find any type definition for api argument type:"+classType+ "for controller function arguments we expect some types as we don't want to accepty 'any' object as that may cause serious security issues if the services are not validating the full object before processing. Remove any type from controller function argument! and have well defined type!");
                return apiRequestArgument; //return original as this is unknown type and its a mistake from our developers
            }else{
                this.classTypeToPropertiesMap[classType].filter(k=>apiRequestArgument.hasOwnProperty(k)).forEach(typeKey=>transformedArgument[typeKey] = apiRequestArgument[typeKey]);
                
                //logging stripped fields
                const removedKeys = Object.keys(apiRequestArgument).filter(x=> !transformedArgument.hasOwnProperty(x)); 
                if(removedKeys.length>0) {
                    if (!this.throwIfUnexpectedKeys) {
                        console.warn(`Unexpected keys are filtered for object type ${classType}, filteredKeys:${removedKeys.join(",")}`);
                    }else{
                        const msg = `Unexpected keys received in the input, unexpectedKeys:${removedKeys.join(",")}`
                        throw new BadRequestError({messageForClient:msg, clientExceptionCode: AppExceptionCode.INVALID_INPUT});
                    }
                }
                return transformedArgument; 
            }
        }else{
            return apiRequestArgument; //no stripping for query params and path arguments of the request
        }
    }
}


export function createClassTypeToPropertiesMapFromSwaggerSchemas(schemas: Record<string, any>): ClassTypeToPropertiesMap {
    const res = {}; 
    Object.getOwnPropertyNames(schemas).forEach(schemaType=>{
        res[schemaType] = schemas[schemaType].properties ? Object.getOwnPropertyNames(schemas[schemaType].properties): undefined;
    })
    return res; 
}