import { SecretsManager } from "aws-sdk";

export const GLOBAL_SECRETS_CACHE: { [key: string]: string } = {};

export class SecretProvider {
  // Fetches the 'value' of the secret named `secretName`.
  // The function assumes that the 'SECRET NAME' is exactly same the 'SECRET_KEY' with which the actual secret-value is stored.
  // Note the 'SECRET NAME' is different than 'SECRET ARN' and this function expects 'SECRET NAME'.
  // Ref - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html#getSecretValue-property
  static async fetchSecretFromAWSSecretManager(secretName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      new SecretsManager().getSecretValue({ SecretId: secretName }, function (err, data) {
        if (err) {
          console.log(
            `Error while fetching secret "${secretName}" from secrets manager. Will return null.\nError ${err}`,
          );
          resolve(null);
        } else {
          // Depending on whether the secret is a string or binary, one of these fields will be populated.
          if ("SecretString" in data) {
            try {
              const secretKeyValue = JSON.parse(data.SecretString);
              resolve(secretKeyValue[secretName] ?? null);
            } catch (e) {
              // Not JSON
              resolve(data.SecretString);
            }
          } else {
            const buff = Buffer.from(data.SecretBinary as any, "base64");
            const decodedBinarySecret = buff.toString("ascii");
            resolve(decodedBinarySecret);
          }
        }
      });
    });
  }
}
