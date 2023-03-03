import { Body, Controller, HttpStatus, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { BubbleWebhookAuthGuard } from "../auth/bubble.webhooks.auth.guard";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";
import { BubbleService } from "./bubble.service";
import {
  RegisterEmployerRequestDTO,
  UpdateEmployeeRequestDTO,
  UpdateEmployerRequestDTO,
} from "./dto/bubble.workflow.controller.dto";
import { EmployerRegisterResponseDTO } from "./dto/EmployerRegisterResponseDTO";
import { BlankResponseDTO } from "../common/dto/BlankResponseDTO";

@Controller("/webhooks/bubble")
@ApiTags("Webhooks")
@IsNoApiKeyNeeded()
@ApiBearerAuth("JWT-auth")
@UseGuards(BubbleWebhookAuthGuard)
export class BubbleWorkflowController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly bubbleService: BubbleService,
  ) {}

  @Post("/employers")
  @ApiOperation({ summary: "Register the Employer in Noba" })
  @ApiResponse({ status: HttpStatus.CREATED, type: EmployerRegisterResponseDTO })
  async registerEmployer(@Body() requestBody: RegisterEmployerRequestDTO): Promise<EmployerRegisterResponseDTO> {
    const nobaEmployerID: string = await this.bubbleService.registerEmployerInNoba({
      bubbleID: requestBody.bubbleID,
      logoURI: requestBody.logoURI,
      name: requestBody.name,
      referralID: requestBody.referralID,
      leadDays: requestBody.leadDays,
      payrollDates: requestBody.payrollDates,
      ...(requestBody.maxAllocationPercent && { maxAllocationPercent: requestBody.maxAllocationPercent }),
    });
    return {
      nobaEmployerID,
    };
  }

  @Patch("/employers/:referralID")
  @ApiOperation({ summary: "Update the Employer in Noba" })
  @ApiResponse({ status: HttpStatus.OK, type: BlankResponseDTO })
  async updateEmployer(
    @Body() requestBody: UpdateEmployerRequestDTO,
    @Param("referralID") referralID: string,
  ): Promise<BlankResponseDTO> {
    await this.bubbleService.updateEmployerInNoba(referralID, requestBody);
    return {};
  }

  @Patch("/employee/:employeeID")
  @ApiOperation({ summary: "Update the Employee in Noba" })
  @ApiResponse({ status: HttpStatus.OK, type: BlankResponseDTO })
  async updateEmployee(
    @Body() requestBody: UpdateEmployeeRequestDTO,
    @Param("employeeID") employeeID: string,
  ): Promise<BlankResponseDTO> {
    await this.bubbleService.updateEmployee(employeeID, requestBody);
    return {};
  }
}
