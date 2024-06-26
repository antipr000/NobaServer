import { Controller, HttpStatus, Inject, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ExchangeRateService } from "../exchangerate.service";
import { ExchangeRateDTO } from "../dto/exchangerate.dto";
import { ExchangeRateWorkflowDTO } from "../dto/exchangerate.workflow.dto";

@Controller("wf/v1/exchangerates") // This defines the path prefix
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
export class ExchangeRateWorkflowController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  @Post("/")
  @ApiOperation({ summary: "Update exchange rate entries" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ExchangeRateWorkflowDTO,
  })
  @ApiForbiddenResponse({ description: "User forbidden from adding new exchange rate" })
  async createExchangeRate(): Promise<ExchangeRateWorkflowDTO> {
    const exchangeRateResults = await this.exchangeRateService.createExchangeRateFromProvider();
    return {
      exchangeRates: exchangeRateResults,
    };
  }
}
