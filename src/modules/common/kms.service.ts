import { KmsKeyringNode, buildClient, CommitmentPolicy } from "@aws-crypto/client-node";
import { Injectable } from "@nestjs/common";
import { KMS_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { KmsConfigs, KmsKeyType } from "../../config/configtypes/KmsConfigs";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

const { encrypt, decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT);

export const ENCRYPT_PREFIX = "[enc]";

// References:
//  - https://www.npmjs.com/package/@aws-crypto/client-node
//  - https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/encryption-sdk-developer-guide.pdf

@Injectable()
export class KmsService {
  private readonly kmsConfigs: KmsConfigs;

  constructor(configService: CustomConfigService) {
    this.kmsConfigs = configService.get<KmsConfigs>(KMS_CONFIG_KEY);
  }

  private generateKeyRing(keyType: KmsKeyType): KmsKeyringNode {
    let generatorKeyKmsArn: string = "";
    let followUpKeysKmsArns: string[] = [];

    switch (keyType) {
      case KmsKeyType.SSN:
        generatorKeyKmsArn = this.kmsConfigs.ssn.generatorKeyArn;
        followUpKeysKmsArns = [this.kmsConfigs.ssn.followUpKeyArn];
        break;

      default:
        throw Error(`KmsKeyType: "${keyType}" is not implemented!`);
    }

    return new KmsKeyringNode({
      generatorKeyId: generatorKeyKmsArn,
      keyIds: followUpKeysKmsArns,
    });
  }

  async encryptString(plainText: string, keyType: KmsKeyType): Promise<string> {
    // If text is blank or already encrypted, just return text
    if (!plainText || plainText.length === 0 || plainText.startsWith(ENCRYPT_PREFIX)) {
      return plainText;
    }

    const { result } = await encrypt(this.generateKeyRing(keyType), plainText, {
      encryptionContext: this.kmsConfigs.context as any,
    });

    // Return encrypted text with a prefix so we know it's encrypted
    return ENCRYPT_PREFIX + result.toString("base64");
  }

  async decryptString(encryptedText: string, keyType: KmsKeyType): Promise<string> {
    // Ensure we don't decrypt an empty value or one which isn't in fact encrypted
    if (!encryptedText || encryptedText.length === 0 || !encryptedText.startsWith(ENCRYPT_PREFIX)) {
      return encryptedText;
    }

    const encryptedPart = encryptedText.substring(ENCRYPT_PREFIX.length);

    const { plaintext, messageHeader } = await decrypt(
      this.generateKeyRing(keyType),
      Buffer.from(encryptedPart, "base64"),
    );
    const { encryptionContext } = messageHeader;

    Object.entries(this.kmsConfigs.context).forEach(([key, value]) => {
      if (encryptionContext[key] !== value) throw new Error("Encryption context does not match expected values");
    });

    return plaintext.toString("utf8");
  }
}
