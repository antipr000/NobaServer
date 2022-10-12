import { Injectable } from "@nestjs/common";
import { Admin } from "../../modules/admin/domain/Admin";
import { DBProvider } from "../DBProvider";

@Injectable()
export class AdminSeeder {
  constructor(private readonly dbProvider: DBProvider) {}

  private async checkIfExistsOtherwiseAdd(admin: Admin) {
    const adminModel = await this.dbProvider.getAdminModel();

    try {
      const response = await adminModel.findOne({ email: admin.props.email }).exec();

      if (response === null) {
        await adminModel.create(admin.props);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async seed() {
    const adminsToSeed = [
      Admin.createAdmin({
        name: "Justin",
        email: "justin@noba.com",
        role: "ADMIN",
      }),
      Admin.createAdmin({
        name: "Soham",
        email: "soham@noba.com",
        role: "ADMIN",
      }),
      Admin.createAdmin({
        name: "Subham",
        email: "subham@noba.com",
        role: "ADMIN",
      }),
    ];

    console.log("Seeding admins into database");

    Promise.all(adminsToSeed.map(admin => this.checkIfExistsOtherwiseAdd(admin)));

    console.log("Seeded admins into database");
  }
}
