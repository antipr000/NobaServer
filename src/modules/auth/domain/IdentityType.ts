const IdentityType = {
  consumer: "CONSUMER",
  partnerAdmin: "PARTNER_ADMIN",
  nobaAdmin: "NOBA_ADMIN",
};

export const allIdentities = Object.values(IdentityType);
export const consumerIdentityIdentifier = IdentityType.consumer;
export const partnerAdminIdentityIdenitfier = IdentityType.partnerAdmin;
export const nobaAdminIdentityIdentifier = IdentityType.nobaAdmin;
