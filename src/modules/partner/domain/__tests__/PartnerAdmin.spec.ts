import { PartnerAdmin, PartnerAdminProps } from "../PartnerAdmin";

const mockPartnerAdminWithAllAccess: PartnerAdminProps = {
  _id: "mock-partner-admin-1",
  email: "allaccess@noba.com",
  partnerId: "partner-1",
  role: "ALL",
};

const mockPartnerAdminWithBasicAccess: PartnerAdminProps = {
  _id: "mock-partner-admin-2",
  email: "basicaccess@noba.com",
  partnerId: "partner-1",
  role: "BASIC",
};

const mockPartnerAdminWithIntermediateAccess: PartnerAdminProps = {
  _id: "mock-partner-admin-3",
  email: "intermediateaccess@noba.com",
  partnerId: "partner-1",
  role: "INTERMEDIATE",
};

describe("PartnerAdmin tests", () => {
  it("should have all access when partner admin role type is ALL", () => {
    const partnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithAllAccess);

    expect(partnerAdmin.canAddPartnerAdmin()).toBe(true);
    expect(partnerAdmin.canGetAllAdmins()).toBe(true);
    expect(partnerAdmin.canGetPartnerDetails()).toBe(true);
    expect(partnerAdmin.canRemovePartnerAdmin()).toBe(true);
    expect(partnerAdmin.canUpdatePartnerAdmin()).toBe(true);
    expect(partnerAdmin.canUpdatePartnerDetails()).toBe(true);
    expect(partnerAdmin.canViewAllTransactions()).toBe(true);
    expect(partnerAdmin.canViewAllUsers()).toBe(true);
    expect(partnerAdmin.canViewStats()).toBe(true);
  });

  it("should have basic access when partner admin role type is BASIC", () => {
    const partnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithBasicAccess);

    expect(partnerAdmin.canAddPartnerAdmin()).toBe(false);
    expect(partnerAdmin.canGetAllAdmins()).toBe(false);
    expect(partnerAdmin.canGetPartnerDetails()).toBe(true);
    expect(partnerAdmin.canRemovePartnerAdmin()).toBe(false);
    expect(partnerAdmin.canUpdatePartnerAdmin()).toBe(false);
    expect(partnerAdmin.canUpdatePartnerDetails()).toBe(false);
    expect(partnerAdmin.canViewAllTransactions()).toBe(false);
    expect(partnerAdmin.canViewAllUsers()).toBe(false);
    expect(partnerAdmin.canViewStats()).toBe(true);
  });

  it("should have intermediate access when partner admin role type is INTERMEDIATE", () => {
    const partnerAdmin = PartnerAdmin.createPartnerAdmin(mockPartnerAdminWithIntermediateAccess);

    expect(partnerAdmin.canAddPartnerAdmin()).toBe(false);
    expect(partnerAdmin.canGetAllAdmins()).toBe(false);
    expect(partnerAdmin.canGetPartnerDetails()).toBe(true);
    expect(partnerAdmin.canRemovePartnerAdmin()).toBe(false);
    expect(partnerAdmin.canUpdatePartnerAdmin()).toBe(false);
    expect(partnerAdmin.canUpdatePartnerDetails()).toBe(false);
    expect(partnerAdmin.canViewAllTransactions()).toBe(true);
    expect(partnerAdmin.canViewAllUsers()).toBe(true);
    expect(partnerAdmin.canViewStats()).toBe(true);
  });
});
