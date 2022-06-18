import { User } from "../domain/User";
import { UserDTO } from "../dto/UserDTO";
import { Mapper } from "../../../core/infra/Mapper";

export class UserMapper implements Mapper<User> {
  public toDomain(raw: any): User {
    return User.createUser(raw);
  }

  public toDTO(user: User): UserDTO {
    const p = user.props;
    return {
      _id: p._id,
      version: p.version,
      name: p.name,
      email: p.email,
      phone: p.phone,
      verificationStatus: p.verificationStatus,
      documentVerified: p.documentVerified,
      dateOfBirth: p.dateOfBirth,
      address: p.address,
    };
  }
}
