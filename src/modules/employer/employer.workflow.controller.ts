import { Body, Controller, Get, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Employee } from "../employee/domain/Employee";
import { EmployeesWorkflowDTO, EmployerWorkflowDTO } from "./dto/employer.workflow.controller.dto";
import { EmployerService } from "./employer.service";
import { EmployerMapper } from "./mappers/employer.mapper";
import { InviteEmployeeRequestDTO } from "./dto/employer.controller.dto";
import { EmployeeDTO } from "../employee/dto/employee.dto";

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
  async getEmployer(@Param("employerID") employerID: string): Promise<EmployerWorkflowDTO> {
    const employer = await this.employerService.getEmployerByID(employerID);

    return this.employerMapper.toEmployerWorkflowDTO(employer);
  }

  @Get("/:employerID/employees")
  @ApiOperation({ summary: "Gets all the employees" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: EmployerWorkflowDTO,
  })
  @ApiNotFoundResponse({ description: "Employer is not found" })
  async getAllEmployees(@Param("employerID") employerID: string): Promise<EmployeesWorkflowDTO> {
    const employees: Employee[] = await this.employerService.getAllEmployees(employerID);

    return this.employerMapper.toEmployeesWorkflowDTO(employees);
  }

  @Post("/:employerID/employees/invite")
  @ApiOperation({ summary: "Invite an employee" })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    type: EmployerWorkflowDTO,
  })
  @ApiBadRequestResponse({ description: "Invalid request" })
  async inviteEmployee(
    @Param("employerID") employerID: string,
    @Body() requestBody: InviteEmployeeRequestDTO,
  ): Promise<EmployeeDTO> {
    const employee = await this.employerService.inviteEmployee(employerID, requestBody);

    return this.employerMapper.toEmployeeDTO(employee);
  }
}
