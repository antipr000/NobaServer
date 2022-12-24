import { Prisma } from "@prisma/client";
import { Admin, AdminProps } from "../domain/Admin";

export class AdminRepoMapper {
  toAdminCreateInput(admin: Admin): Prisma.AdminCreateInput {
    return {
      id: admin.props.id,
      email: admin.props.email,
      ...(admin.props.name && { name: admin.props.name }),
      ...(admin.props.role && { role: admin.props.role }),
    };
  }

  toAdminUpdateInput(adminProps: Partial<AdminProps>): Prisma.AdminUpdateInput {
    return {
      ...(adminProps.name && { name: adminProps.name }),
      ...(adminProps.role && { role: adminProps.role }),
    };
  }
}
