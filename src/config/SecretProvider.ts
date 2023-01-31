import { SecretsManager } from "aws-sdk";

export const GLOBAL_SECRETS_CACHE: { [key: string]: string } = {};

export class SecretProvider {
  static async loadAWSMasterSecret(secretName: string) {
    const masterSecret = await SecretProvider.fetchSecretFromAWSSecretManager(secretName, true);
    for (const key in masterSecret) {
      //console.log(`Caching secret "${key}" in global cache.`);
      GLOBAL_SECRETS_CACHE[key] = masterSecret[key];
    }
  }

  // Fetches the 'value' of the secret named `secretName`.
  // The function assumes that the 'SECRET NAME' is exactly same the 'SECRET_KEY' with which the actual secret-value is stored.
  // Note the 'SECRET NAME' is different than 'SECRET ARN' and this function expects 'SECRET NAME'.
  // Ref - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html#getSecretValue-property
  static async fetchSecretFromAWSSecretManager(secretName: string, master: boolean = false): Promise<any> {
    return new Promise((resolve, reject) => {
      // First check the global cache
      if (GLOBAL_SECRETS_CACHE[secretName]) {
        resolve(GLOBAL_SECRETS_CACHE[secretName]);
        return;
      }

      new SecretsManager().getSecretValue({ SecretId: secretName }, function (err, data) {
        if (err) {
          console.log(
            `Error while fetching secret "${secretName}" from secrets manager. Will return null.\nError ${err}`,
          );
          resolve(null);
        } else {
          // Depending on whether the secret is a string or binary, one of these fields will be populated.
          if ("SecretString" in data) {
            if (!master) {
              // Only warn here, as if it's a base64 encoded string, those can't go in the master cache and must be loaded separately.
              // For instance, private or public key blocks.
              console.warn(
                `Secret "${secretName}" is not configured in the master cache. Please define it in the master cache.`,
              );
            }

            try {
              const secretKeyValue = JSON.parse(data.SecretString);
              if (master) {
                resolve(secretKeyValue);
              } else {
                resolve(secretKeyValue[secretName] ?? null);
              }
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
