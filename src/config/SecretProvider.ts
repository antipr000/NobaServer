import * as AWS  from "aws-sdk";
import { SecretsManager } from "aws-sdk";


export const GLOBAL_SECRETS_CACHE: {[key: string]: string} = {}; 



export class SecretProvider {


    static secretManager: SecretsManager = new AWS.SecretsManager();

    static async loadSecrets(configs) {
        const d = await this.fetchSecretFromAWSSecretManager("arn:aws:secretsmanager:us-east-1:210194402305:secret:TEST_SECRET_KEY_FOR_TESTING-aoYPPl")
        console.log("Secret fetched from AWS Secrets Manager", d);
        return configs;
    }



    static async fetchSecretFromAWSSecretManager(secretName: string) {
        //const  secretName = "arn:aws:secretsmanager:us-east-1:210194402305:secret:TEST_STRIPE_SECRET_KEY-6pSFZy",
        // Create a Secrets Manager client
        

        // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
        // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        // We rethrow the exception by default.
        return new Promise((resolve, reject) => { 
            SecretProvider.secretManager.getSecretValue({SecretId: secretName}, function(err, data) {
                if (err) {
                    console.log("Error while fetching secret from secrets manager, will return null, please debug", err);
                    resolve(null);
                    /* if (err.code === 'DecryptionFailureException')
                        // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
                        // Deal with the exception here, and/or rethrow at your discretion.
                        throw err;
                    else if (err.code === 'InternalServiceErrorException')
                        // An error occurred on the server side.
                        // Deal with the exception here, and/or rethrow at your discretion.
                        throw err;
                    else if (err.code === 'InvalidParameterException')
                        // You provided an invalid value for a parameter.
                        // Deal with the exception here, and/or rethrow at your discretion.
                        throw err;
                    else if (err.code === 'InvalidRequestException')
                        // You provided a parameter value that is not valid for the current state of the resource.
                        // Deal with the exception here, and/or rethrow at your discretion.
                        throw err;
                    else if (err.code === 'ResourceNotFoundException')
                        // We can't find the resource that you asked for.
                        // Deal with the exception here, and/or rethrow at your discretion.
                        throw err; */
                }
                else {
                    // Decrypts secret using the associated KMS key.
                    // Depending on whether the secret is a string or binary, one of these fields will be populated.
                    if ('SecretString' in data) {
                        const secret = data.SecretString;
                        resolve(secret)
                    } else {
                        const buff = new Buffer(data.SecretBinary as any, 'base64');
                        const decodedBinarySecret = buff.toString('ascii');
                        resolve(decodedBinarySecret);
                    }
                }
        
            });
        
        }); 
    }
}