import { Controller, Get, Inject, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UserID } from '../auth/roles.decorator';
import { Admin } from '../auth/admin.decorator';
import { ApiResponse } from '@nestjs/swagger';


@Admin()
@Controller("admin/:"+UserID)
export class AdminController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(private readonly adminService: AdminService) {

  }
  
  @Get("/")
  @ApiResponse({ status: HttpStatus.OK, description: "Health check for verification service" })
  async getVerificationStatus(): Promise<string> {
      return "Hello Noba user. Admin seems to work fine!";
  }

}