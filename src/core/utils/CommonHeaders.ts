import { ApiHeaderOptions } from "@nestjs/swagger";
import { X_NOBA_API_KEY, X_NOBA_SIGNATURE, X_NOBA_TIMESTAMP } from "../../modules/auth/domain/HeaderConstants";
import { AppEnvironment, getEnvironmentName } from "../../config/ConfigurationUtils";

export function getCommonHeaders(): ApiHeaderOptions[] {
  const appEnvironment: AppEnvironment = getEnvironmentName();

  return [
    {
      name: X_NOBA_API_KEY,
      required: true,
    },
    {
      name: X_NOBA_SIGNATURE,
      required: appEnvironment === AppEnvironment.PROD,
    },
    {
      name: X_NOBA_TIMESTAMP,
      required: appEnvironment === AppEnvironment.PROD,
      description: "Timestamp in milliseconds, use: new Date().getTime().toString()",
    },
  ];
}
