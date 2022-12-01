import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { BaseProps,  basePropsJoiSchemaKeys, Entity } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";

const Permissions = {
  viewNobaDashboard: "VIEW_NOBA_DASHBOARD",
  viewConsumerSupportTickets: "VIEW_CONSUMER_SUPPORT_TICKETS",
  viewPartnersSupportTickets: "VIEW_PARTNER_SUPPORT_TICKETS",
  registerPartner: "REGISTER_A_NEW_PARTNER",
  addAdminsToPartner: "ADD_PARTNER_ADMIN",
  updateAdminsForPartner: "UPDATE_PARTNER_ADMIN",
  removePartnerAdmin: "REMOVE_PARTNER_ADMIN",
  addNobaAdmin: "ADD_NOBA_ADMIN",
  removeNobaAdmin: "REMOVE_NOBA_ADMIN",
  changeNobaAdminPrivileges: "CHANGE_NOBA_ADMIN_PRIVILEGES",
  updateConsumerData: "UPDATE_CONSUMER_DATA",
  queryPartnerTransactions: "QUERY_PARTNER_TRANSACTIONS",
};

export enum NOBA_ADMIN_ROLE_TYPES {
  BASIC = "BASIC",
  INTERMEDIATE = "INTERMEDIATE",
  ADMIN = "ADMIN",
}

const AdminRolesWithTheirPrivileges = {
  BASIC: {
    permissions: [Permissions.viewNobaDashboard, Permissions.viewConsumerSupportTickets],
  },
  INTERMEDIATE: {
    permissions: [
      Permissions.viewNobaDashboard,
      Permissions.viewConsumerSupportTickets,
      Permissions.viewPartnersSupportTickets,
      Permissions.registerPartner,
      Permissions.addAdminsToPartner,
      Permissions.updateAdminsForPartner,
      Permissions.removePartnerAdmin,
      Permissions.queryPartnerTransactions,
    ],
  },
  ADMIN: {
    permissions: [
      Permissions.viewNobaDashboard,
      Permissions.viewConsumerSupportTickets,
      Permissions.viewPartnersSupportTickets,
      Permissions.registerPartner,
      Permissions.addAdminsToPartner,
      Permissions.removePartnerAdmin,
      Permissions.addNobaAdmin,
      Permissions.updateAdminsForPartner,
      Permissions.removeNobaAdmin,
      Permissions.changeNobaAdminPrivileges,
      Permissions.updateConsumerData,
      Permissions.queryPartnerTransactions,
    ],
  },
};

export const AllRoles = Object.keys(AdminRolesWithTheirPrivileges);

export const isValidRole = role => {
  return AllRoles.find(validRole => (role === validRole ? role : undefined)) !== undefined;
};

export interface AdminProps extends BaseProps {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export const AdminKeys: KeysRequired<AdminProps> = {
  ... basePropsJoiSchemaKeys,
  _id: Joi.string().min(10).required(),
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string()
    .email()
    .allow(null)
    .optional()
    .meta({ _mongoose: { index: true } }),
  role: Joi.string()
    .valid(...Object.keys(AdminRolesWithTheirPrivileges))
    .required(),
};

export const adminJoiSchema = Joi.object(AdminKeys).options({ allowUnknown: true, stripUnknown: false });

export class Admin extends AggregateRoot<AdminProps> {
  private constructor(adminProps: AdminProps) {
    super(adminProps);
  }

  public static createAdmin(adminProps: Partial<AdminProps>): Admin {
    if (!adminProps._id) adminProps._id = Entity.getNewID();
    return new Admin(Joi.attempt(adminProps, adminJoiSchema));
  }

  public canViewNobaDashboards(): boolean {
    return this.hasPermission(Permissions.viewNobaDashboard);
  }

  public canViewCustomerSupportTickets(): boolean {
    return this.hasPermission(Permissions.viewConsumerSupportTickets);
  }

  public canViewPartnerSupportTickets(): boolean {
    return this.hasPermission(Permissions.viewPartnersSupportTickets);
  }

  public canRegisterPartner(): boolean {
    return this.hasPermission(Permissions.registerPartner);
  }

  public canAddAdminsToPartner(): boolean {
    return this.hasPermission(Permissions.addAdminsToPartner);
  }

  public canUpdateAdminsForPartner(): boolean {
    return this.hasPermission(Permissions.updateAdminsForPartner);
  }

  public canRemoveAdminsFromPartner(): boolean {
    return this.hasPermission(Permissions.removePartnerAdmin);
  }

  public canAddNobaAdmin(): boolean {
    return this.hasPermission(Permissions.addNobaAdmin);
  }

  public canRemoveNobaAdmin(): boolean {
    return this.hasPermission(Permissions.removeNobaAdmin);
  }

  public canChangeNobaAdminPrivileges(): boolean {
    return this.hasPermission(Permissions.changeNobaAdminPrivileges);
  }

  public canUpdateConsumerData(): boolean {
    return this.hasPermission(Permissions.updateConsumerData);
  }

  private hasPermission(requiredPermission: string): boolean {
    // The permission must be one of the permissions in the 'Permission' array.
    if (
      Object.values(Permissions).find(permission => (permission === requiredPermission ? permission : undefined)) ===
      undefined
    )
      return false;

    const allowedPermissions: string[] = AdminRolesWithTheirPrivileges[this.props.role].permissions;
    return (
      allowedPermissions.find(permission => (permission === requiredPermission ? permission : undefined)) !== undefined
    );
  }
}
