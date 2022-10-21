import { ApiHeaderOptions } from "@nestjs/swagger";
import { X_NOBA_API_KEY, X_NOBA_SIGNATURE, X_NOBA_TIMESTAMP } from "../../modules/auth/domain/HeaderConstants";
import { isProductionEnvironment } from "../../config/ConfigurationUtils";

export function getCommonHeaders(): ApiHeaderOptions[] {
  return [
    {
      name: X_NOBA_API_KEY,
      required: true,
    },
    {
      name: X_NOBA_SIGNATURE,
      required: isProductionEnvironment(),
    },
    {
      name: X_NOBA_TIMESTAMP,
      required: isProductionEnvironment(),
      description: "Timestamp in milliseconds, use: new Date().getTime().toString()",
    },
  ];
}
