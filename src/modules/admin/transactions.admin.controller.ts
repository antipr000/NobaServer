import { Controller, Inject } from '@nestjs/common';
import { TransactionAdminService } from './transactions.admin.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Roles, UserID } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';


@Roles(Role.User)
@Controller("user/:"+UserID)
export class TransactionsAdminController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(private readonly transactionAdminService: TransactionAdminService) {

  }
  

}