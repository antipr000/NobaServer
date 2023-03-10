import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { basePropsJoiSchemaKeys, Entity } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";
import { Admin as AdminModel } from "@prisma/client";

const Permissions = {
  viewNobaDashboard: "VIEW_NOBA_DASHBOARD",
  viewConsumerSupportTickets: "VIEW_CONSUMER_SUPPORT_TICKETS",
  addNobaAdmin: "ADD_NOBA_ADMIN",
  removeNobaAdmin: "REMOVE_NOBA_ADMIN",
  changeNobaAdminPrivileges: "CHANGE_NOBA_ADMIN_PRIVILEGES",
  viewAllAdmins: "VIEW_ALL_ADMINS",
  updateConsumerData: "UPDATE_CONSUMER_DATA",
};

export enum ACCOUNT_BALANCE_TYPES {
  CIRCLE = "CIRCLE",
  MONO = "MONO",
}

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
    permissions: [Permissions.viewNobaDashboard, Permissions.viewConsumerSupportTickets],
  },
  ADMIN: {
    permissions: [
      Permissions.viewNobaDashboard,
      Permissions.viewConsumerSupportTickets,
      Permissions.addNobaAdmin,
      Permissions.removeNobaAdmin,
      Permissions.changeNobaAdminPrivileges,
      Permissions.updateConsumerData,
      Permissions.viewAllAdmins,
    ],
  },
};

export const AllRoles = Object.keys(AdminRolesWithTheirPrivileges);

export const isValidRole = role => {
  return AllRoles.find(validRole => (role === validRole ? role : undefined)) !== undefined;
};

export class AdminProps implements Partial<AdminModel> {
  id: string;
  name?: string | null;
  email: string;
  role?: string | null;
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
}

export const AdminKeys: KeysRequired<AdminProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().min(10).required(),
  name: Joi.string().min(2).max(100).optional().allow(null),
  email: Joi.string().email().required(),
  role: Joi.string()
    .valid(...Object.keys(AdminRolesWithTheirPrivileges))
    .required(),
};

export const adminJoiSchema = Joi.object(AdminKeys).options({ allowUnknown: false, stripUnknown: true });

export class Admin extends AggregateRoot<AdminProps> {
  private constructor(adminProps: AdminProps) {
    super(adminProps);
  }

  public static createAdmin(adminProps: Partial<AdminProps>): Admin {
    if (!adminProps.id) adminProps.id = Entity.getNewID();
    if (!adminProps.role) adminProps.role = NOBA_ADMIN_ROLE_TYPES.BASIC;
    return new Admin(Joi.attempt(adminProps, adminJoiSchema));
  }

  public canViewNobaDashboards(): boolean {
    return this.hasPermission(Permissions.viewNobaDashboard);
  }

  public canViewCustomerSupportTickets(): boolean {
    return this.hasPermission(Permissions.viewConsumerSupportTickets);
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

  public canViewAllAdmins(): boolean {
    return this.hasPermission(Permissions.viewAllAdmins);
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
