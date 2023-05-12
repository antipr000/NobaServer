import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CircleService } from "../public/circle.service";
import { EmployerService } from "../../../modules/employer/employer.service";
import { ExchangeRateService } from "../../../modules/exchangerate/exchangerate.service";
import { Currency } from "../../../modules/transaction/domain/TransactionTypes";
import { CircleWalletBalanceResponseDTO } from "../dto/circle.controller.dto";

@Injectable()
export class CircleWorkflowService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly circleService: CircleService,
    private readonly employerService: EmployerService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async getCircleBalanceAfterPayingAllDisbursementForInvoicedPayrolls(): Promise<CircleWalletBalanceResponseDTO> {
    const totalAllocationAmount = await this.employerService.getTotalAllocationAmountAcrossInvoicedPayrolls();
    const masterWalletID = await this.circleService.getMasterWalletID();
    const masterWalletBalance = await this.circleService.getWalletBalance(masterWalletID);
    const exchangeRate = await this.exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD);

    return {
      walletID: masterWalletID,
      balance: (masterWalletBalance ?? 0) - (totalAllocationAmount ?? 0) * exchangeRate.nobaRate,
    };
  }
}
