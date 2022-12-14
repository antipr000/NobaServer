import { IdentityType as IdentityTypeModel } from "@prisma/client";

// Backward compatibility
export const IdentityType = {
  CONSUMER: IdentityTypeModel.CONSUMER,
  NOBA_ADMIN: IdentityTypeModel.NOBA_ADMIN,
};

export const allIdentities = Object.values(IdentityType);
export const consumerIdentityIdentifier = IdentityType.CONSUMER;
export const nobaAdminIdentityIdentifier = IdentityType.NOBA_ADMIN;
