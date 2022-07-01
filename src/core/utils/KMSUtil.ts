import { KmsKeyringNode, buildClient, CommitmentPolicy } from "@aws-crypto/client-node";
import { getEnvironmentName, getPropertyFromEnvironment } from "../../config/ConfigurationUtils";

const { encrypt, decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT);
const ENCRYPT_PREFIX = "[enc]";

// References:
//  - https://www.npmjs.com/package/@aws-crypto/client-node
//  - https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/encryption-sdk-developer-guide.pdf
export class KMSUtil {
  keyring: KmsKeyringNode;
  context = {
    stage: getEnvironmentName(),
    purpose: "Noba Onramp app",
    origin: "us-east-1",
  };

  constructor(keyAlias: string) {
    const generatorKeyId = getPropertyFromEnvironment("kmsGeneratorKeyID");
    const keyIds = [getPropertyFromEnvironment(keyAlias + "_keyID")];
    this.keyring = new KmsKeyringNode({ generatorKeyId, keyIds });
  }

  async encryptString(plainText: string): Promise<string> {
    // If text is blank or already encrypted, just return text
    if (!plainText || plainText.length === 0 || plainText.startsWith(ENCRYPT_PREFIX)) {
      return plainText;
    }

    const { result } = await encrypt(this.keyring, plainText, {
      encryptionContext: this.context,
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

    const { plaintext, messageHeader } = await decrypt(this.keyring, Buffer.from(encryptedPart, "base64"));

    const { encryptionContext } = messageHeader;
    Object.entries(this.context).forEach(([key, value]) => {
      if (encryptionContext[key] !== value) throw new Error("Encryption context does not match expected values");
    });

    return plaintext.toString("utf8");
  }
}
