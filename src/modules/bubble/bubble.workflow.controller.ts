import { Body, Controller, HttpStatus, Inject, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";
import { BubbleService } from "./bubble.service";
import { RegisterEmployerRequestDTO, UpdateEmployerRequestDTO } from "./dto/bubble.workflow.controller.dto";

@Controller("/webhooks/bubble")
@ApiTags("Webhooks")
@IsNoApiKeyNeeded()
export class BubbleWorkflowController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly bubbleService: BubbleService,
  ) {}

  // TODO: Add Bearer Token based AuthN/AuthZ logic here.
  @Post("/employers")
  @ApiOperation({ summary: "Register the Employer in Noba" })
  @ApiResponse({ status: HttpStatus.CREATED })
  async registerEmployer(@Body() requestBody: RegisterEmployerRequestDTO) {
    const nobaEmployerID: string = await this.bubbleService.registerEmployerInNoba({
      bubbleID: requestBody.bubbleID,
      logoURI: requestBody.logoURI,
      name: requestBody.name,
      referralID: requestBody.referralID,
      leadDays: requestBody.leadDays,
      payrollDays: requestBody.payrollDays,
    });
    return nobaEmployerID;
  }

  @Patch("/employers/:referralID")
  @ApiOperation({ summary: "Update the Employer in Noba" })
  @ApiResponse({ status: HttpStatus.OK })
  async updateEmployer(@Body() requestBody: UpdateEmployerRequestDTO, @Param("referralID") referralID: string) {
    await this.bubbleService.updateEmployerInNoba(referralID, requestBody);
  }
}
