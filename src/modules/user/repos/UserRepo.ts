import { Repo } from "../../../core/infra/Repo";
import { User } from "../domain/User";
import { Result } from "../../../core/logic/Result";
import { Injectable } from "@nestjs/common";

@Injectable()
export abstract class IUserRepo implements Repo<User> {
  getUser(userID: string): Promise<User> {
    throw new Error("Method not implemented");
  }
  createUser(user: User): Promise<User> {
    throw new Error("Method not implemented");
  }
  getUserIfExists(id: string): Promise<Result<User>> {
    throw new Error("Method not implemented");
  }
  exists(id: string): Promise<boolean> {
    throw new Error("Method not implemented");
  }
  getUserByEmail(email: string): Promise<Result<User>> {
    throw new Error("Method not implemented");
  }
  getUserByPhone(phone: string): Promise<Result<User>> {
    throw new Error("Method not implemented");
  }
  updateUser(user: User): Promise<User> {
    throw new Error("Method not implemented");
  }
}
