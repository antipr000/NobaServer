import { ApiHeaderOptions } from "@nestjs/swagger";
import { X_NOBA_API_KEY, X_NOBA_SIGNATURE, X_NOBA_TIMESTAMP } from "../../modules/auth/domain/HeaderConstants";

export function getCommonHeaders(): ApiHeaderOptions[] {
  return [
    {
      name: X_NOBA_API_KEY,
      required: true,
    },
    {
      name: X_NOBA_SIGNATURE,
      required: true,
    },
    {
      name: X_NOBA_TIMESTAMP,
      required: true,
    },
  ];
}
