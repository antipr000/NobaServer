import { DBProvider } from "../../../infraproviders/DBProvider";
import { Transaction, TransactionProps } from "../domain/Transaction";
import { TransactionMapper } from "../mapper/TransactionMapper";
import { ITransactionRepo } from "./TransactionRepo";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { TransactionFilterOptions, TransactionStatus, transactionPropFromQuerySortField } from "../domain/Types";

import { subDays } from "date-fns";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PaginatedResult, SortOrder, EMPTY_PAGE_RESULT } from "../../../core/infra/PaginationTypes";
import { SortOptions, paginationPipeLine } from "../../../infra/mongodb/paginate/PaginationPipeline";
import {
  PartnerTransaction,
  PartnerTransactionFilterOptions,
  UpdateFiatTransactionInfoRequest,
} from "../domain/TransactionRepoTypes";
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
  ): Promise<Transaction[]> {
    this.logger.debug(
      `Fetching all pending transaction with status "${status}" which are updated ` +
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

  async getPartnerTransactions(filters: PartnerTransactionFilterOptions, outputCsvFilePath: string): Promise<any> {
    const timestampFilters = {};
    if (filters.startDate !== undefined && filters.startDate !== null) {
      timestampFilters["$gte"] = filters.startDate;
    }
    if (filters.endDate !== undefined && filters.endDate !== null) {
      timestampFilters["$lte"] = filters.endDate;
    }

    const transactionFilters = {};
    if (filters.partnerID !== undefined && filters.partnerID !== null) {
      transactionFilters["partnerID"] = filters.partnerID;
    }
    if (Object.keys(timestampFilters).length !== 0) {
      transactionFilters["transactionTimestamp"] = timestampFilters;
    }
    if (!filters.includeIncompleteTransactions) {
      transactionFilters["transactionStatus"] = TransactionStatus.COMPLETED;
    }

    const headers = [
      { id: "partnerID", title: "PARTNER_ID" },
      { id: "transactionID", title: "TRANSACTION_ID" },
      { id: "userID", title: "USER_ID" },
      { id: "transactionCreationDate", title: "TRANSACTION_CREATION_DATE" },
      { id: "status", title: "STATUS" },
      { id: "fiatAmount", title: "FIAT_AMOUNT" },
      { id: "fiatCurrency", title: "FIAT_CURRENCY" },
      { id: "cryptoQuantity", title: "CRYPTO_QUANTITY" },
      { id: "cryptoCurrency", title: "CRYPTO_CURRENCY" },
      { id: "processingFeeCharged", title: "PROCESSING_FEE_CHARGED" },
      { id: "networkFeeCharged", title: "NETWORK_FEE_CHARGED" },
      { id: "nobaFeeCharged", title: "NOBA_FEE_CHARGED" },
      { id: "fixedCreditCardFeeWaived", title: "FIXED_CREDIT_CARD_FEE_WAIVED" },
      { id: "dynamicCreditCardFeeWaived", title: "DYNAMIC_CREDIT_CARD_FEE_WAIVED" },
      { id: "nobaFeeWaived", title: "NOBA_FEE_WAIVED" },
      { id: "networkFeeWaived", title: "NETWORK_FEE_WAIVED" },
      { id: "spreadAmountWaived", title: "SPREAD_AMOUNT_WAIVED" },
    ];

    const csvStringifier = createCsvStringifier({
      header: headers,
    });
    fs.appendFileSync(outputCsvFilePath, csvStringifier.getHeaderString());

    let recordsQueried = 0;

    const transactionModel = await this.dbProvider.getTransactionModel();
    const result = new Promise((resolve, reject) => {
      transactionModel
        .find(transactionFilters)
        .cursor()
        .on("data", async doc => {
          recordsQueried++;

          const partnerTransaction: PartnerTransaction = this.convertToPartnerTransactionSchema(doc);
          fs.appendFileSync(outputCsvFilePath, csvStringifier.stringifyRecords([partnerTransaction]));
        })
        .on("end", () => {
          resolve(0);
          this.logger.debug(`Fetched ${recordsQueried} transactions with status.`);
        })
        .on("error", err => {
          reject(err);
        });
    });

    return result;
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
      ...(filterOpts.partnerID && { partnerID: filterOpts.partnerID }),
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

  async getUserTransactionInAnInterval(
    userId: string,
    partnerID: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<Transaction[]> {
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

    if (partnerID != undefined) {
      query.and([{ partnerID: partnerID }]);
    }

    const result: any = await query.sort({ transactionTimestamp: "desc" }).exec();
    const transactionPropsList: TransactionProps[] = convertDBResponseToJsObject(result);
    return transactionPropsList.map(userTransaction => this.transactionMapper.toDomain(userTransaction));
  }

  convertToPartnerTransactionSchema(transactionDocument): PartnerTransaction {
    const result: PartnerTransaction = {
      partnerID: transactionDocument.partnerID,
      transactionID: transactionDocument.transactionID,
      userID: transactionDocument.userId,
      status: transactionDocument.transactionStatus,
      transactionCreationDate: new Date(transactionDocument.transactionTimestamp).toUTCString(),
      fiatAmount: 0,
      fiatCurrency: "",
      cryptoQuantity: 0,
      cryptoCurrency: "",
      processingFeeCharged: transactionDocument.processingFee,
      networkFeeCharged: transactionDocument.networkFee,
      nobaFeeCharged: transactionDocument.nobaFee,
      fixedCreditCardFeeWaived: transactionDocument.discounts.fixedCreditCardFeeDiscount,
      dynamicCreditCardFeeWaived: transactionDocument.discounts.dynamicCreditCardFeeDiscount,
      nobaFeeWaived: transactionDocument.discounts.nobaFeeDiscount,
      networkFeeWaived: transactionDocument.discounts.networkFeeDiscount,
      spreadAmountWaived: transactionDocument.discounts.spreadDiscount,
    };

    switch (transactionDocument.fixedSide) {
      case CurrencyType.FIAT: {
        result.fiatAmount = transactionDocument.leg1Amount;
        result.fiatCurrency = transactionDocument.leg1;
        result.cryptoQuantity = transactionDocument.leg2Amount;
        result.cryptoCurrency = transactionDocument.leg2;
        break;
      }
      case CurrencyType.CRYPTO: {
        result.fiatAmount = transactionDocument.leg2Amount;
        result.fiatCurrency = transactionDocument.leg2;
        result.cryptoQuantity = transactionDocument.leg1Amount;
        result.cryptoCurrency = transactionDocument.leg1;
        break;
      }
    }

    return result;
  }
}
