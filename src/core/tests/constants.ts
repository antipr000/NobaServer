import { UserDTO } from "../../modules/user/dto/UserDTO";
import { PartnerProps } from "../../modules/partner/domain/Partner";
import { PartnerAdminProps } from "../../modules/partner/domain/PartnerAdmin";
export const userEmail = "John.Doe@noba.com";
export const userID = "test-user-01";
export const userDTO: UserDTO = {
  _id: userID,
  email: userEmail,
  name: "John Doe",
  idVerified: false,
  documentVerified: false,
  address: undefined,
  dateOfBirth: undefined,
  phone: undefined,
  version: undefined,
};

export const mockPartner: PartnerProps = {
  _id: "mock-partner-1",
  name: "Mock Partner",
  publicKey: "mockPublicKey",
  privateKey: "mockPrivateKey",
};

export const updatePartnerName = "Updated Mock Partner";
export const updateTakeRate = 12.4;

export const mockPartnerAdminWithAllAccess: PartnerAdminProps = {
  _id: "mock-partner-admin-1",
  email: "mock@partner.com",
  partnerId: "mock-partner-1",
  role: "ALL",
};

export const mockPartnerAdminWithBasicAccess: PartnerAdminProps = {
  _id: "mock-partner-admin-2",
  email: "mock2@partner.com",
  partnerId: "mock-partner-1",
  role: "BASIC",
};

export const mockPartnerAdminWithIntermediateAccess: PartnerAdminProps = {
  _id: "mock-partner-admin-3",
  email: "mock3@partner.com",
  partnerId: "mock-partner-1",
  role: "INTERMEDIATE",
};

export const mockFailureEmailAddress = "mock4@partner.com";
