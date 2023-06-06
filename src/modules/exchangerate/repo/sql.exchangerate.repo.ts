import { PrismaService } from "../../../infraproviders/PrismaService";
import {
  convertToDomainExchangeRate,
  ExchangeRate,
  InputExchangeRate,
  validateInputExchangeRate,
  validateSavedExchangeRate,
} from "../domain/ExchangeRate";
import { Prisma, ExchangeRate as PrismaExchangeRateModel } from "@prisma/client";
import { IExchangeRateRepo } from "./exchangerate.repo";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import {
  DatabaseInternalErrorException,
  InvalidDatabaseRecordException,
} from "../../../core/exception/CommonAppException";
import { AlertService } from "src/modules/common/alerts/alert.service";

@Injectable()
export class SQLExchangeRateRepo implements IExchangeRateRepo {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly alertService: AlertService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createExchangeRate(exchangeRate: InputExchangeRate): Promise<ExchangeRate> {
    validateInputExchangeRate(exchangeRate);
    let savedExchangeRate: ExchangeRate = null;
    try {
      const exchangeRateInput: Prisma.ExchangeRateCreateInput = {
        numeratorCurrency: exchangeRate.numeratorCurrency.toUpperCase(),
        denominatorCurrency: exchangeRate.denominatorCurrency.toUpperCase(),
        bankRate: exchangeRate.bankRate,
        nobaRate: exchangeRate.nobaRate,
        expirationTimestamp: exchangeRate.expirationTimestamp,
      };

      const returnedExchangeRate = await this.prismaService.exchangeRate.create({ data: exchangeRateInput });
      savedExchangeRate = convertToDomainExchangeRate(returnedExchangeRate);
    } catch (err) {
      this.alertService.raiseError(`${err} - ${JSON.stringify(err)} - ${JSON.stringify(exchangeRate)}`);
      throw new DatabaseInternalErrorException({
        message: "Error saving transaction in database",
      });
    }

    try {
      validateSavedExchangeRate(savedExchangeRate);
    } catch (err) {
      this.alertService.raiseError(`JSON.stringify(err) - ${JSON.stringify(savedExchangeRate)}`);
      throw new InvalidDatabaseRecordException({
        message: "Invalid database record",
      });
    }

    return savedExchangeRate;
  }

  async getExchangeRateForCurrencyPair(
    numeratorCurrency: string,
    denominatorCurrency: string,
    expirationFilter?: Date,
  ): Promise<ExchangeRate> {
    try {
      const exchangeRate: PrismaExchangeRateModel = await this.prismaService.exchangeRate.findFirst({
        where: {
          numeratorCurrency: numeratorCurrency.toUpperCase(),
          denominatorCurrency: denominatorCurrency.toUpperCase(),
          ...(expirationFilter && {
            expirationTimestamp: {
              gte: expirationFilter,
            },
          }),
        },
        orderBy: {
          // The 'where' clause takes care of only getting exchange rates that have not expired
          // but we still need to order by createdTimestamp to get the most recent one
          createdTimestamp: "desc",
        },
      });

      if (!exchangeRate) {
        return null;
      }

      return convertToDomainExchangeRate(exchangeRate);
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
      return null;
    }
  }
}
