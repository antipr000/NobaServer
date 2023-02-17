import { ApiHeaderOptions } from "@nestjs/swagger";
import { X_NOBA_API_KEY, X_NOBA_SIGNATURE, X_NOBA_TIMESTAMP } from "../../modules/auth/domain/HeaderConstants";
import { isE2ETestEnvironment, isProductionEnvironment } from "../../config/ConfigurationUtils";

export function getCommonHeaders(): ApiHeaderOptions[] {
  return [
    {
      name: X_NOBA_API_KEY,
      required: true,
    },
    {
      name: X_NOBA_SIGNATURE,
      required: isProductionEnvironment() || isE2ETestEnvironment(),
    },
    {
      name: X_NOBA_TIMESTAMP,
      required: isProductionEnvironment() || isE2ETestEnvironment(),
      description: "Timestamp in milliseconds, use: new Date().getTime().toString()",
    },
  ];
}
