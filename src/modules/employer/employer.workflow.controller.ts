import { Controller, Get, HttpStatus, Inject, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { EmployerWorkflowDTO } from "./dto/employer.workflow.controller.dto";
import { EmployeeAllocationCurrency } from "../employee/domain/Employee";

@Controller("wf/v1/employer")
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
export class EmployerWorkflowController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

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
    if (!employees) {
      return {
        employerName: "Fake Employer",
        employerLogoURI: "https://fake.employer/logo.png",
        leadDays: 1,
        employerReferralID: "123",
        payrollDates: ["2021-01-01", "2021-01-02"],
        nextPayrollDate: "2021-01-03",
        maxAllocationPercent: 20,
        employees: [],
      };
    } else {
      return {
        employerName: "Fake Employer",
        employerLogoURI: "https://fake.employer/logo.png",
        leadDays: 1,
        employerReferralID: "123",
        payrollDates: ["2021-01-01", "2021-01-02"],
        nextPayrollDate: "2021-01-03",
        maxAllocationPercent: 20,
        employees: [
          {
            id: "456",
            allocationAmount: 1000,
            allocationCurrency: EmployeeAllocationCurrency.COP,
            employerID: employerID,
            consumerID: "123",
            salary: 10000,
          },
          {
            id: "789",
            allocationAmount: 1000,
            allocationCurrency: EmployeeAllocationCurrency.COP,
            employerID: employerID,
            consumerID: "234",
            salary: 10000,
          },
        ],
      };
    }
  }
}
