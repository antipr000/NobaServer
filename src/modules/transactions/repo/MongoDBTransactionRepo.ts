import { DBProvider } from "../../../infraproviders/DBProvider";
import { Transaction, TransactionProps } from "../domain/Transaction";
import { TransactionMapper } from "../mapper/TransactionMapper";
import { ITransactionRepo } from "./TransactionRepo";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  TransactionFilterOptions,
  TransactionStatus,
  transactionPropFromQuerySortField,
  TransactionType,
} from "../domain/Types";

import { subDays } from "date-fns";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PaginatedResult, SortOrder, EMPTY_PAGE_RESULT } from "../../../core/infra/PaginationTypes";
import { SortOptions, paginationPipeLine } from "../../../infra/mongodb/paginate/PaginationPipeline";
import { UpdateFiatTransactionInfoRequest } from "../domain/TransactionRepoTypes";
import { CurrencyType } from "../../../modules/common/domain/Types";
import { createObjectCsvStringifier as createCsvStringifier } from "csv-writer";
import fs from "fs";

type AggregateResultType = {
  _id: number;
  totalSum: number;
};

@Injectable()
export class MongoDBTransactionRepo implements ITransactionRepo {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly transactionMapper = new TransactionMapper();

  constructor(private readonly dbProvider: DBProvider) {}

  // TODO(#349): Migrate the "sync" Transaction fetching logic to "cursor" based logic.
  async getValidTransactionsToProcess(
    maxLastUpdateTime: number,
    minStatusUpdateTime: number,
    status: TransactionStatus,
    type: TransactionType[],
  ): Promise<Transaction[]> {
    this.logger.debug(
      `Fetching all pending transaction of type "${type.join(", ")}" with status "${status}" which are updated ` +
        ` before "${maxLastUpdateTime}" (i.e. ${(Date.now().valueOf() - maxLastUpdateTime) / 1000} seconds ago) ` +
        `and the status has been updated after "${minStatusUpdateTime}" (isn't stalled).`,
    );

    const transactionModel = await this.dbProvider.getTransactionModel();
    const results = await transactionModel.find({
      transactionStatus: status,
      type: { $in: type },
      lastProcessingTimestamp: {
        $lte: maxLastUpdateTime,
      },
      lastStatusUpdateTimestamp: {
        $gte: minStatusUpdateTime,
      },
    });

    this.logger.debug(
      `Fetched ${results.length} transactions with status "${status}" which are updated ` +
        ` before "${maxLastUpdateTime}" (i.e. ${(Date.now().valueOf() - maxLastUpdateTime) / 1000} seconds ago) ` +
        `and the status has been updated after "${minStatusUpdateTime}" (isn't stalled).`,
    );

    return results.map(x => this.transactionMapper.toDomain(convertDBResponseToJsObject(x)));
  }

  // TODO(#349): Migrate the "sync" Transaction fetching logic to "cursor" based logic.
  async getStaleTransactionsToProcess(
    maxLastUpdateTime: number,
    minStatusUpdateTime: number,
    status: TransactionStatus,
  ): Promise<Transaction[]> {
    this.logger.debug(
      `Fetching all stale transaction with status "${status}" which are updated ` +
        ` before "${maxLastUpdateTime}" (i.e. ${(Date.now().valueOf() - maxLastUpdateTime) / 1000} seconds ago) ` +
        `and the status has been updated after "${minStatusUpdateTime}" (isn't stalled).`,
    );

    const transactionModel = await this.dbProvider.getTransactionModel();
    const results = await transactionModel.find({
      transactionStatus: status,
      lastProcessingTimestamp: {
        $lte: maxLastUpdateTime,
      },
      lastStatusUpdateTimestamp: {
        $lt: minStatusUpdateTime,
      },
    });

    this.logger.debug(
      `Fetched ${results.length} transactions with status "${status}" which are updated ` +
        ` before "${maxLastUpdateTime}" (i.e. ${(Date.now().valueOf() - maxLastUpdateTime) / 1000} seconds ago) ` +
        `and the status has been updated after "${minStatusUpdateTime}" (isn't stalled).`,
    );

    return results.map(x => this.transactionMapper.toDomain(convertDBResponseToJsObject(x)));
  }

  async updateFiatTransactionInfo(request: UpdateFiatTransactionInfoRequest): Promise<void> {
    const updatedFiatInfoFields = {};

    if (request.willUpdateIsApproved) {
      updatedFiatInfoFields["fiatPaymentInfo.isApproved"] = request.updatedIsApprovedValue;
    }
    if (request.willUpdateIsCompleted) {
      updatedFiatInfoFields["fiatPaymentInfo.isCompleted"] = request.updatedIsCompletedValue;
    }
    if (request.willUpdateIsFailed) {
      updatedFiatInfoFields["fiatPaymentInfo.isFailed"] = request.updatedIsFailedValue;
    }

    const transactionModel = await this.dbProvider.getTransactionModel();
    await transactionModel
      .findByIdAndUpdate(request.transactionID, {
        $set: {
          ...updatedFiatInfoFields,
        },
        $push: {
          "fiatPaymentInfo.details": request.details,
        },
      })
      .exec();
  }

  async getAll(): Promise<Transaction[]> {
    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel.find().exec();
    const transactionPropsList: TransactionProps[] = convertDBResponseToJsObject(result);
    return transactionPropsList.map(transactionResult => this.transactionMapper.toDomain(transactionResult));
  }

  async getTransaction(id: string): Promise<Transaction> {
    const transaction = await this.getTransactionByIDOrTransactionID(id);
    return transaction;
  }

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    // Date.now() will give you the same UTC timestamp independent of your current timezone.
    // Such a timestamp, rather a point in time, does not depend on timezones.
    transaction.props.lastProcessingTimestamp = Date.now().valueOf();
    transaction.props.lastStatusUpdateTimestamp = Date.now().valueOf();

    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel.create(transaction.props);
    const transactionProps: TransactionProps = convertDBResponseToJsObject(result);
    return this.transactionMapper.toDomain(transactionProps);
  }

  async updateTransaction(transaction: Transaction): Promise<Transaction> {
    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel.findByIdAndUpdate(transaction.props._id, transaction.props).exec();
    const transactionProps: TransactionProps = convertDBResponseToJsObject(result);
    return this.transactionMapper.toDomain(transactionProps);
  }

  async updateLastProcessingTimestamp(transactionId: string): Promise<Transaction> {
    // Date.now() will give you the same UTC timestamp independent of your current timezone.
    // Such a timestamp, rather a point in time, does not depend on timezones.
    const lastProcessingTimestamp: number = Date.now().valueOf();

    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel
      .findByIdAndUpdate(transactionId, { lastProcessingTimestamp: lastProcessingTimestamp })
      .exec();
    const transactionProps: TransactionProps = convertDBResponseToJsObject(result);
    return this.transactionMapper.toDomain(transactionProps);
  }

  async updateTransactionStatus(
    transactionId: string,
    newStatus: TransactionStatus,
    otherProps: Partial<TransactionProps>,
  ): Promise<Transaction> {
    // Date.now() will give you the same UTC timestamp independent of your current timezone.
    // Such a timestamp, rather a point in time, does not depend on timezones.
    const lastStatusUpdateTimestamp = Date.now().valueOf();

    const transactionProps = otherProps;
    transactionProps.transactionStatus = newStatus;
    transactionProps.lastStatusUpdateTimestamp = lastStatusUpdateTimestamp;

    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel.findByIdAndUpdate(transactionId, { $set: transactionProps }).exec();
    const updatedTransactionProps: TransactionProps = convertDBResponseToJsObject(result);
    return this.transactionMapper.toDomain(updatedTransactionProps);
  }

  async updateStatusWithExactTransactionProps(
    transactionId: string,
    newStatus: TransactionStatus,
    targetState: Partial<TransactionProps>,
  ): Promise<Transaction> {
    // Date.now() will give you the same UTC timestamp independent of your current timezone.
    // Such a timestamp, rather a point in time, does not depend on timezones.
    const lastStatusUpdateTimestamp = Date.now().valueOf();

    const transactionProps = targetState;
    transactionProps.transactionStatus = newStatus;
    transactionProps.lastStatusUpdateTimestamp = lastStatusUpdateTimestamp;

    const unsetFields = [];
    const allFields = Object.keys(transactionProps);
    allFields.forEach(field => {
      if (!transactionProps[field]) {
        unsetFields.push(field);
      }
    });
    const unsetFieldsWithEmptyValue = {};
    unsetFields.forEach(field => {
      unsetFieldsWithEmptyValue[field] = "";
    });

    const transactionModel = await this.dbProvider.getTransactionModel();
    await transactionModel
      .updateOne({ _id: transactionId }, { $set: transactionProps, $unset: unsetFieldsWithEmptyValue })
      .exec();
    const result: any = await transactionModel.findById(transactionId).exec();

    const updatedTransactionProps: TransactionProps = convertDBResponseToJsObject(result);
    return this.transactionMapper.toDomain(updatedTransactionProps);
  }

  async getTransactionByIDOrTransactionID(id: string): Promise<Transaction> {
    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel.findOne({ $or: [{ _id: id }, { transactionID: id }] }).exec();
    if (result == null) {
      throw new NotFoundException("Transaction does not exist");
    }

    const transactionProps: TransactionProps = convertDBResponseToJsObject(result);
    return this.transactionMapper.toDomain(transactionProps);
  }

  async getFilteredTransactions(
    transactionsFilterOptions: TransactionFilterOptions = {},
  ): Promise<PaginatedResult<Transaction>> {
    const transactionModel = await this.dbProvider.getTransactionModel();
    const filterOpts = transactionsFilterOptions;
    const sortOptions: SortOptions<TransactionProps> = {
      field: "transactionTimestamp",
      order: SortOrder.DESC,
    };

    const sortField = transactionPropFromQuerySortField(transactionsFilterOptions.sortField);
    sortOptions.field = sortField ?? sortOptions.field;
    sortOptions.order = transactionsFilterOptions.sortOrder ?? sortOptions.order;

    const filterQuery = {
      ...(filterOpts.consumerID && { userId: filterOpts.consumerID }),
      ...(filterOpts.transactionStatus && { transactionStatus: filterOpts.transactionStatus }),
      ...(filterOpts.fiatCurrency && { leg1: filterOpts.fiatCurrency }),
      ...(filterOpts.cryptoCurrency && { leg2: filterOpts.cryptoCurrency }),
      ...(filterOpts.startDate && {
        transactionTimestamp: { $gte: new Date(new Date(filterOpts.startDate).toISOString()) },
      }),
      ...(filterOpts.endDate && {
        transactionTimestamp: { $lte: new Date(new Date(filterOpts.endDate).toISOString()) },
      }),
    };

    const pipeline = paginationPipeLine(
      filterOpts.pageOffset ?? 0,
      filterOpts.pageLimit ?? 10,
      filterQuery,
      sortOptions,
    );

    const result = await transactionModel.aggregate(pipeline as any).exec();
    const pageResult = (result[0] ?? EMPTY_PAGE_RESULT) as unknown as PaginatedResult<TransactionProps>;

    if (!pageResult.items && pageResult.totalItems == 0) {
      pageResult.items = [];
    }

    const transactions = pageResult.items.map(transactionProps => this.transactionMapper.toDomain(transactionProps));

    return { ...pageResult, items: transactions, totalPages: Math.ceil(pageResult.totalPages) }; //ceil is not supported in documentDB pipeline so we need to do it here
  }

  private async getPeriodicUserTransactionAmount(userId: string, days: number): Promise<number> {
    const dateToCheck = subDays(new Date(), days);
    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: AggregateResultType[] = await transactionModel
      .aggregate([
        {
          $match: {
            userId: userId,

            transactionTimestamp: {
              $gt: dateToCheck,
            },
            $or: [
              // Transactions that are PENDING or COMPLETED or are still processing
              // (lastProcessingTimestamp will not exist after processing completes)
              { transactionStatus: { $in: [TransactionStatus.PENDING, TransactionStatus.COMPLETED] } },
              { lastProcessingTimestamp: { $exists: true } },
            ],
          },
        },
        {
          $group: {
            _id: 1,
            totalSum: { $sum: "$leg1Amount" },
          },
        },
      ])
      .exec();
    if (result.length === 0) return 0;

    return result[0].totalSum;
  }

  async getTotalUserTransactionAmount(userId: string): Promise<number> {
    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: AggregateResultType[] = await transactionModel
      .aggregate([
        {
          $match: {
            userId: userId,
          },
        },
        {
          $group: {
            _id: 1,
            totalSum: {
              $sum: "$leg1Amount",
            },
          },
        },
      ])
      .exec();
    if (result.length === 0) return 0;
    return result[0].totalSum;
  }

  async getMonthlyUserTransactionAmount(userId: string): Promise<number> {
    return this.getPeriodicUserTransactionAmount(userId, 30);
  }

  async getWeeklyUserTransactionAmount(userId: string): Promise<number> {
    return this.getPeriodicUserTransactionAmount(userId, 7);
  }

  async getDailyUserTransactionAmount(userId: string): Promise<number> {
    return this.getPeriodicUserTransactionAmount(userId, 1);
  }

  async getUserACHUnsettledTransactionAmount(userId: string, achPaymentMethodIds: string[]): Promise<number> {
    const transactionModel = await this.dbProvider.getTransactionModel();

    /*
     * Unsettled ach transaction means:
     * PaymentMethod should be ACH. We will pass users list of ach payment method ids. transaction.fiatPaymentInfo.paymentMethodID should be in that list
     * fiatPaymentInfo.isCompleted is false
     */
    const result = await transactionModel
      .find({
        userId: userId,
        "fiatPaymentInfo.isCompleted": false,
        "fiatPaymentInfo.paymentMethodID": { $in: achPaymentMethodIds },
      })
      .exec();
    const unsettledAchTransactions: TransactionProps[] = convertDBResponseToJsObject(result);
    return unsettledAchTransactions.reduce((acc, val) => acc + val.leg1Amount, 0);
  }

  async getUserTransactionInAnInterval(userId: string, fromDate: Date, toDate: Date): Promise<Transaction[]> {
    const transactionModel = await this.dbProvider.getTransactionModel();

    const query = transactionModel.find({ userId: userId });
    if (fromDate != undefined) {
      query.and([
        {
          transactionTimestamp: {
            $gt: `${new Date(new Date(fromDate.toISOString()).setUTCHours(0, 0, 0)).toISOString()}`, // Ensure toDate is inclusive
          },
        },
      ]);
    }

    if (toDate != undefined) {
      query.and([
        {
          transactionTimestamp: {
            $lt: `${new Date(new Date(toDate.toISOString()).setUTCHours(23, 59, 59)).toISOString()}`, // Ensure fromDate is inclusive
          },
        },
      ]);
    }

    const result: any = await query.sort({ transactionTimestamp: "desc" }).exec();
    const transactionPropsList: TransactionProps[] = convertDBResponseToJsObject(result);
    return transactionPropsList.map(userTransaction => this.transactionMapper.toDomain(userTransaction));
  }
}
