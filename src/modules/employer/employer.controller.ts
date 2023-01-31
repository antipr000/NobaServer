import { Body, Controller, HttpStatus, Inject, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiHeaders, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { EmployerService } from "./employer.service";
import { EmployerDTO } from "./dto/employer.controller.dto";

@Controller("v1/employers")
@Roles(Role.CONSUMER)
@ApiBearerAuth("JWT-auth")
@ApiHeaders(getCommonHeaders())
@ApiTags("Employers")
export class EmployerController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly employerService: EmployerService;

  @Post("/:referralID")
  @ApiOperation({ summary: "Retrieve employer details by referral ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: EmployerDTO,
    description: "Employer summary",
  })
  @ApiNotFoundResponse({ description: "Employer not found" })
  async getEmployerByReferralID(@Param("referralID") referralID: string): Promise<EmployerDTO> {
    const employer = await this.employerService.getEmployerByReferralID(referralID);
    if (!employer) {
      throw new NotFoundException("Employer not found");
    }
    return {
      name: employer.name,
      logoURI: employer.logoURI,
      leadDays: employer.leadDays,
      payrollDays: employer.payrollDays,
    };
  }
}
