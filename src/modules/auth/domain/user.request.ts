import { Request } from "express";
import { AuthenticatedUser } from "./AuthenticatedUser";

export interface UserRequest extends Request {
  user: AuthenticatedUser;
}
