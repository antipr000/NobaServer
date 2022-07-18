import { KmsKeyringNode, buildClient, CommitmentPolicy } from "@aws-crypto/client-node";
import { Injectable } from "@nestjs/common";
import { KMS_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomKmsEncryptionContext, KmsConfigs } from "../../config/configtypes/KmsConfigs";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

const { encrypt, decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT);

export const ENCRYPT_PREFIX = "[enc]";

// References:
//  - https://www.npmjs.com/package/@aws-crypto/client-node
//  - https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/encryption-sdk-developer-guide.pdf

@Injectable()
export class KmsService {
  private readonly encryptionContext: CustomKmsEncryptionContext;
  private readonly generatorKeyKmsArn: string;
  private readonly followUpKeysKmsArns: Array<string>;

  constructor(configService: CustomConfigService) {
    const kmsConfigs: KmsConfigs = configService.get<KmsConfigs>(KMS_CONFIG_KEY);
    this.encryptionContext = kmsConfigs.context;
    this.generatorKeyKmsArn = kmsConfigs.generatorKeyArn;
    this.followUpKeysKmsArns = [kmsConfigs.followUpKeyArn];
  }

  private generateKeyRing(): KmsKeyringNode {
    return new KmsKeyringNode({
      generatorKeyId: this.generatorKeyKmsArn,
      keyIds: this.followUpKeysKmsArns,
    });
  }

  async encryptString(plainText: string): Promise<string> {
    // If text is blank or already encrypted, just return text
    if (!plainText || plainText.length === 0 || plainText.startsWith(ENCRYPT_PREFIX)) {
      return plainText;
    }

    const { result } = await encrypt(this.generateKeyRing(), plainText, {
      encryptionContext: this.encryptionContext as any,
    });

    // Return encrypted text with a prefix so we know it's encrypted
    return ENCRYPT_PREFIX + result.toString("base64");
  }

  async decryptString(encryptedText: string): Promise<string> {
    // Ensure we don't decrypt an empty value or one which isn't in fact encrypted
    if (!encryptedText || encryptedText.length === 0 || !encryptedText.startsWith(ENCRYPT_PREFIX)) {
      return encryptedText;
    }

    const encryptedPart = encryptedText.substring(ENCRYPT_PREFIX.length);

    const { plaintext, messageHeader } = await decrypt(this.generateKeyRing(), Buffer.from(encryptedPart, "base64"));
    const { encryptionContext } = messageHeader;

    Object.entries(this.encryptionContext).forEach(([key, value]) => {
      if (encryptionContext[key] !== value) throw new Error("Encryption context does not match expected values");
    });

    return plaintext.toString("utf8");
  }
}
