import { Controller, Get, HttpStatus, Inject, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { EmployerWorkflowDTO } from "./dto/employer.workflow.controller.dto";
import { EmployerService } from "./employer.service";
import { EmployerMapper } from "./mappers/employer.mapper";

@Controller("wf/v1/employers")
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
export class EmployerWorkflowController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly employerService: EmployerService;

  private readonly employerMapper: EmployerMapper;

  constructor() {
    this.employerMapper = new EmployerMapper();
  }

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
    const employer = await this.employerService.getEmployerWithEmployees(employerID, employees);

    return this.employerMapper.toEmployerWorkflowDTO(employer);
  }
}
