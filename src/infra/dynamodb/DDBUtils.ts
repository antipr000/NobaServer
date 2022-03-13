import { Entity } from '../../core/domain/Entity';
import * as _ from 'lodash';
import { QueryIterator } from '@aws/dynamodb-data-mapper';
import { DuplicateItemException } from '../../core/exception/CommonAppException';
import { DynamoDBModel } from './DynamoBaseDefinitions';


// A single GSI can be shared by any number of DB models so maximum number of GSI we will have for a table will be decided by db model requiring maximum GSIs
// if a db model using a common GSI they should do it in a systematic, readable, maintainable way
export type GSIConsumer<T> = { 
    modelName: string, //name of the model using GSI
    gsi: GSIType<any>, //gsi meta information
    gsiPK?: string & keyof T, //attribute of domain model which should become value of gsi's pk attribute
    gsiSK?: string & keyof T, //attribute of domain model which should become value of gsi's sk attribute
    constGSISK?: string, //sort key for the index item is a constant,for example for user look up by email sort key should be just "Email"; gsiSK shouldn't be present
    constGSIPK?: string, //partition key for the index item is a constant,for example for getting all institutes from user table.
    description: string // reason why we are using this GSI for a DB model
}

export type TableMeta = {
    tableName: string,
	partitionKeyAttribute: string,
    sortKeyAttribute: string,
    description?: string
}

export type GSIType<T> = {
    table?: TableMeta //todo make it required field once all GSIType follow same pattern
    gsiName: string,
    partitionKeyAttribute?: string & keyof T, //TODO make it required
    sortKeyAttribute?: string & keyof T, //TODO make it required
    projectionAttributes?: (keyof T)[],
}


export const DDBTypes = {
    Number: "Number",
    String: "String",
    Boolean: "Boolean",
    Date: "Date",
    Any: "Any",
    Map: "Map",
    Set: "Set"
    //TODO add more as needed
}

export const VERSION_ATTRIBUTE =  "versionAttribute";
export const ENTITY_VERSION_KEY = "version"
export const DDB_KEY_TYPE = "keyType";
export const HASH_KEY_TYPE = "HASH";
export const RANGE_KEY_TYPE = "RANGE";


export const defaultDDBSchemaFields = {
     [ENTITY_VERSION_KEY]: {
        type: DDBTypes.Number,
        [VERSION_ATTRIBUTE]: true
      },

      createdAt: {
          type: DDBTypes.String
      },

      updatedAt: {
          type: DDBTypes.String
      }
}

export type CrudOptions = {// any one of them should be present
    isCreating?: boolean,
    isReading?: boolean,
    isUpdating?: boolean,
    isDeleting?: boolean
}


export function ddbSchemaForGSIs(gsis: GSIType<any>[]): any {
    const schema = {}; 

    for(const gsi of gsis) {
        schema[gsi.partitionKeyAttribute] = {
            type: "String",
        }

        schema[gsi.sortKeyAttribute] = {
            type: "String",
        }
    }

    return schema;
}



export function joiToDDBSchema<JoiSchemaType>(joiKeys: JoiSchemaType): any{
    const joiToDDBType = {
        "number" : "Number",
        "string" : "String",
        "boolean" : "Boolean",
        "object" : "Any", 
        "date": "String" //we are saving date as String otherwise DDB will convert it to number internally and we don't want that as we want readability while viewing the data in raw form
    }

    const schema = {}; 

    for(const key of Object.getOwnPropertyNames(joiKeys)) {
        schema[key] = {
            type: joiToDDBType.hasOwnProperty(joiKeys[key].type)? joiToDDBType[joiKeys[key].type] : DDBTypes.Any,
        }
    }

    return schema; 
}



export function addGSIAttributes<T>(props: T, gsiConsumedByModel: GSIConsumer<T>[] ): T{
    for(const gsiConsumer of gsiConsumedByModel)  
    {
        if(!gsiConsumer.gsiPK && !gsiConsumer.constGSIPK) {
            throw new Error("GSI Consumer should have gsiPK or constGSIPK!!")
        }

        if(gsiConsumer.gsiPK && gsiConsumer.constGSIPK) {
            throw new Error("GSI Consumer cannot define both const partition key and partitionKeyAttribute in model to be used!!")
        }

        props[gsiConsumer.gsi.partitionKeyAttribute] = gsiConsumer.constGSIPK ?? props[gsiConsumer.gsiPK]; 
        
        if(gsiConsumer.gsiSK && gsiConsumer.constGSISK) {
            throw new Error("GSI Consumer cannot define both const sort key and sortKeyAttribute in model to be used!!")
        }

        props[gsiConsumer.gsi.sortKeyAttribute] = gsiConsumer.constGSISK ?? props[gsiConsumer.gsiSK] 
    }

    return props; 
}

export function getProps<Z>(raw: Z | Entity<Z>, gsiConsumers: GSIConsumer<Z>[]=[]): Z {
    let props:Z;
    if(Entity.isEntity(raw)){
        props = raw.props; 
     }else{
        props = raw; 
     }
     return addGSIAttributes(props, gsiConsumers);
}

export function toDDBModelInstance<T extends DynamoDBModel>(raw:any, Model: { new (...args: any): T}, options: CrudOptions = {}): T{
    const model: T = new Model();

    if(Entity.isEntity(raw)){
       Object.assign(model,raw.props);
    }else{
        Object.assign(model,raw); 
    }

    if(options.isCreating) {
        model['createdAt'] = new Date().toISOString(); 
        model['updatedAt'] = new Date().toISOString();
    } else if (options.isUpdating) {
        model['updatedAt'] = new Date().toISOString();
    } else if(options.isReading){
        //for now we don't do anything
    } else if (options.isDeleting){
        //for now we don't do anything
    } else {
        throw new Error ("crud operation to be performed on entity is not defined i.e. we need to know if this is a first time creation of entity or update, data:"+JSON.stringify(raw));
    }

    return model; 
 }
 
export function unwrapDDBItem(item: any): any {
    //DDB mappers don't convert number values in a collection (object,collection,map) to javascript number by default (as that cannot hold much,precision etc.), they create an object of type NumberValue
    //https://github.com/awslabs/dynamodb-data-mapper-js/blob/master/packages/dynamodb-data-marshaller/src/unmarshallItem.ts
    return  JSON.parse(JSON.stringify(item)); //gets the job done but will be slow, TODO deep transform values ? 
}

export async function getAllItems<T>(iterator: QueryIterator<T> | AsyncIterableIterator<T>): Promise<T[]> {
    const results: T[] = [];

    for await(const record of iterator){
        results.push(record);
    } 
    
    return results; 
}


export async function getNoneOrOneElseThrow<T>(iterator: QueryIterator<T>): Promise<T> {
    const results = await getAllItems(iterator); 
    if(results.length>1){
        throw new DuplicateItemException({message: `duplicate items found, items: ${JSON.stringify(results)}`});
    }/* else if (results.length==0) {
        throw new NotFoundException()
    } */
    return results.length==1? results[0] : undefined; //none or one
}

export async function existsOne<T>(iterator: QueryIterator<T>): Promise<boolean> {
    return (await getNoneOrOneElseThrow(iterator))? true: false
}