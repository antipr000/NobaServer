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

@Injectable()
export class SQLExchangeRateRepo implements IExchangeRateRepo {
  constructor(
    private readonly prismaService: PrismaService,
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
      this.logger.error(`${err} - ${JSON.stringify(err)} - ${JSON.stringify(exchangeRate)}`);
      throw new DatabaseInternalErrorException({
        message: "Error saving transaction in database",
      });
    }

    try {
      validateSavedExchangeRate(savedExchangeRate);
    } catch (err) {
      this.logger.error(`JSON.stringify(err) - ${JSON.stringify(savedExchangeRate)}`);
      throw new InvalidDatabaseRecordException({
        message: "Invalid database record",
      });
    }

    return savedExchangeRate;
  }

  async getExchangeRateForCurrencyPair(numeratorCurrency: string, denominatorCurrency: string): Promise<ExchangeRate> {
    try {
      const exchangeRate: PrismaExchangeRateModel = await this.prismaService.exchangeRate.findFirst({
        where: {
          numeratorCurrency: numeratorCurrency.toUpperCase(),
          denominatorCurrency: denominatorCurrency.toUpperCase(),
        },
        orderBy: {
          expirationTimestamp: "desc", // Always grab only the latest
        },
      });

      if (!exchangeRate) {
        return null;
      }

      return convertToDomainExchangeRate(exchangeRate);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return null;
    }
  }
}
