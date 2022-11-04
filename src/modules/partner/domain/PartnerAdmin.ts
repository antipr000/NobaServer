import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";

const Permissions = {
  UPDATE_PARTNER_DETAILS: "UPDATE_PARTNER_DETAILS",
  GET_PARTNER_DETAILS: "GET_PARTNER_DETAILS",
  ADD_PARTNER_ADMIN: "ADD_PARTNER_ADMIN",
  REMOVE_PARTNER_ADMIN: "REMOVE_PARTNER_ADMIN",
  GET_ALL_ADMINS: "GET_ALL_ADMINS",
  GET_ALL_CONSUMERS: "GET_ALL_CONSUMERS",
  UPDATE_PARTNER_ADMIN: "UPDATE_PARTNER_ADMIN",
  VIEW_ALL_TRANSACTIONS: "VIEW_ALL_TRANSACTIONS",
  VIEW_ALL_USERS: "VIEW_ALL_USERS",
  VIEW_STATS: "VIEW_STATS",
};

export enum PARTNER_ADMIN_ROLE_TYPES {
  BASIC = "BASIC",
  INTERMEDIATE = "INTERMEDIATE",
  ALL = "ALL",
}

const PartnerAdminRolePrivileges = {
  BASIC: {
    permissions: [Permissions.GET_PARTNER_DETAILS, Permissions.VIEW_STATS],
  },
  INTERMEDIATE: {
    permissions: [
      Permissions.GET_PARTNER_DETAILS,
      Permissions.VIEW_STATS,
      Permissions.VIEW_ALL_TRANSACTIONS,
      Permissions.VIEW_ALL_USERS,
    ],
  },
  ALL: {
    permissions: [
      Permissions.UPDATE_PARTNER_DETAILS,
      Permissions.GET_PARTNER_DETAILS,
      Permissions.ADD_PARTNER_ADMIN,
      Permissions.REMOVE_PARTNER_ADMIN,
      Permissions.GET_ALL_ADMINS,
      Permissions.GET_ALL_CONSUMERS,
      Permissions.UPDATE_PARTNER_ADMIN,
      Permissions.VIEW_ALL_TRANSACTIONS,
      Permissions.VIEW_ALL_USERS,
      Permissions.VIEW_STATS,
    ],
  },
};

export interface PartnerAdminProps extends VersioningInfo {
  _id: string;
  name?: string;
  email: string;
  partnerId: string;
  role: string;
}

export const partnerAdminKeys: KeysRequired<PartnerAdminProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().min(10).required(),
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string()
    .email()
    .allow(null)
    .required()
    .meta({ _mongoose: { index: true } }),
  partnerId: Joi.string().required(),
  // TODO: Remove the default & make the role required after fixing the tests
  role: Joi.string()
    .valid(...Object.keys(PartnerAdminRolePrivileges))
    .default("BASIC"),
};

export const partnerAdminSchema = Joi.object(partnerAdminKeys).options({ allowUnknown: true, stripUnknown: false });

export class PartnerAdmin extends AggregateRoot<PartnerAdminProps> {
  private constructor(partnerAdminProps: PartnerAdminProps) {
    super(partnerAdminProps);
  }

  public static createPartnerAdmin(partnerAdminProps: Partial<PartnerAdminProps>): PartnerAdmin {
    if (!partnerAdminProps._id) partnerAdminProps._id = Entity.getNewID();
    return new PartnerAdmin(Joi.attempt(partnerAdminProps, partnerAdminSchema));
  }

  public canUpdatePartnerDetails(): boolean {
    return this.hasPermission(Permissions.UPDATE_PARTNER_DETAILS);
  }

  public canGetPartnerDetails(): boolean {
    return this.hasPermission(Permissions.GET_PARTNER_DETAILS);
  }

  public canAddPartnerAdmin(): boolean {
    return this.hasPermission(Permissions.ADD_PARTNER_ADMIN);
  }

  public canRemovePartnerAdmin(): boolean {
    return this.hasPermission(Permissions.REMOVE_PARTNER_ADMIN);
  }

  public canUpdatePartnerAdmin(): boolean {
    return this.hasPermission(Permissions.UPDATE_PARTNER_ADMIN);
  }

  public canGetAllAdmins(): boolean {
    return this.hasPermission(Permissions.GET_ALL_ADMINS);
  }

  public canGetAllConsumers(): boolean {
    return this.hasPermission(Permissions.GET_ALL_CONSUMERS);
  }

  public canViewAllTransactions(): boolean {
    return this.hasPermission(Permissions.VIEW_ALL_TRANSACTIONS);
  }

  public canViewAllUsers(): boolean {
    return this.hasPermission(Permissions.VIEW_ALL_USERS);
  }

  public canViewStats(): boolean {
    return this.hasPermission(Permissions.VIEW_STATS);
  }

  private hasPermission(requiredPermission: string): boolean {
    // The permission must be one of the permissions in the 'Permission' array.
    if (
      Object.values(Permissions).find(permission => (permission === requiredPermission ? permission : undefined)) ===
      undefined
    )
      return false;

    const allowedPermissions: Array<string> = PartnerAdminRolePrivileges[this.props.role].permissions;
    return (
      allowedPermissions.find(permission => (permission === requiredPermission ? permission : undefined)) !== undefined
    );
  }
}
