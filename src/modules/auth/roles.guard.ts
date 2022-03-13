import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from './domain/AuthenticatedUser';
import { Role } from './role.enum';
import { ONE_OF_ROLES_KEY, ROLES_KEY, UserID } from './roles.decorator';

//***************** https://docs.nestjs.com/security/authorization */

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {

    //user needs to have all of these roles
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
    ]);

    //user needs to have one of these roles along with the required roles
    const oneOfRoles = this.reflector.getAllAndOverride<Role[]>(ONE_OF_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // return true; //not activiting while testing

    const req = context.switchToHttp().getRequest();
    

    const urlParams = req.params;

    return true;



    /* if (!requiredRoles || requiredRoles.length === 0) {//no roles required, this will never happen as if no roles required then why even put decorator on resource?
      console.log("no roles required", requiredRoles); //TODO remove
      return true;
    }

    // console.log("printing request", context.switchToHttp().getRequest())

    const authenticatedUser: AuthenticatedUser = context.switchToHttp().getRequest().user;

    const authenticatedUserRoles = this.getAuthenticatedUsersRolesOnRequestedResource(authenticatedUser, resourceUserID);

    const missingRoles = requiredRoles.filter(requiredRole => !authenticatedUserRoles.includes(requiredRole));

    if(missingRoles.length==0) {
        return true;
    }else{
        console.log("User doesn't have these required roles on the request resource:", missingRoles.join(","));
    }
  */
  }

  private getAuthenticatedUsersRolesOnRequestedResource(
    authUser: AuthenticatedUser,
    resourceUserID: string,
   
  ): Role[] {
    const eligbleRoles = []; 
    if(authUser) {
        if(resourceUserID && authUser.uid === resourceUserID) {//resource owner userID matches with requesting user's uid
            eligbleRoles.push(Role.User);
        }
    }

    return eligbleRoles;
  }

  private getContextValue(key: string, context: ExecutionContext): any {
    this.reflector.getAllAndOverride<Role[]>(key, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}


