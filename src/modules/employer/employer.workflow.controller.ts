import { Controller, Get, HttpStatus, Inject, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { EmployerWorkflowDTO } from "./dto/employer.workflow.controller.dto";
import { EmployerService } from "./employer.service";

@Controller("wf/v1/employer")
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
export class EmployerWorkflowController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly employerService: EmployerService;

  @Get("/:employerID")
  @ApiOperation({ summary: "Gets details of an employer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: EmployerWorkflowDTO,
  })
  @ApiNotFoundResponse({ description: "Requested employer is not found" })
  async getEmployer(
    @Param("employerID") employerID: string,
    @Query() employees?: boolean,
  ): Promise<EmployerWorkflowDTO> {
    const employer = await this.employerService.getEmployer(employerID, employees);

    const payrollDatesAsc = employer.payrollDates.sort(); // Naturally sorts strings in ascending order
    const now = new Date().setHours(0, 0, 0, 0);
    const futurePayrollDates = payrollDatesAsc.filter(date => {
      return new Date(date) > new Date(now + employer.leadDays * 24 * 60 * 60 * 1000);
    });

    return {
      employerName: employer.name,
      employerLogoURI: employer.logoURI,
      leadDays: employer.leadDays,
      employerReferralID: employer.referralID,
      payrollDates: payrollDatesAsc,
      nextPayrollDate: futurePayrollDates[0],
      ...(employer.maxAllocationPercent && { maxAllocationPercent: employer.maxAllocationPercent }),
      employees: employer.employees.map(employee => ({
        id: employee.id,
        allocationAmount: employee.allocationAmount,
        allocationCurrency: employee.allocationCurrency,
        employerID: employee.employerID,
        consumerID: employee.consumerID,
        ...(employee.salary && { salary: employee.salary }),
      })),
    };
  }
}
