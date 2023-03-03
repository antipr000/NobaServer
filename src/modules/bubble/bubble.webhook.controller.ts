import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { BubbleWebhookAuthGuard } from "../auth/bubble.webhooks.auth.guard";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";
import { BubbleService } from "./bubble.service";
import {
  CreatePayrollRequestDTO,
  CreatePayrollResponseDTO,
  RegisterEmployerRequestDTO,
  UpdateEmployeeRequestDTO,
  UpdateEmployerRequestDTO,
} from "./dto/bubble.webhook.controller.dto";
import { EmployerRegisterResponseDTO } from "./dto/EmployerRegisterResponseDTO";
import { BlankResponseDTO } from "../common/dto/BlankResponseDTO";
import { isValidDateString } from "src/core/utils/DateUtils";

@Controller("/webhooks/bubble")
@ApiTags("Webhooks")
@IsNoApiKeyNeeded()
@ApiBearerAuth("JWT-auth")
@UseGuards(BubbleWebhookAuthGuard)
export class BubbleWebhookController {
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

  @Post("/employers/:referralID/payroll")
  @ApiOperation({ summary: "Creates payroll for employer in Noba" })
  @ApiResponse({ status: HttpStatus.CREATED, type: CreatePayrollResponseDTO })
  async createPayroll(
    @Param("referralID") referralID: string,
    @Body() request: CreatePayrollRequestDTO,
  ): Promise<CreatePayrollResponseDTO> {
    if (!isValidDateString(request.payrollDate)) {
      throw new BadRequestException("Invalid payrollDate");
    }

    const payroll = await this.bubbleService.createPayroll(referralID, request.payrollDate);
    return {
      payrollID: payroll.id,
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
