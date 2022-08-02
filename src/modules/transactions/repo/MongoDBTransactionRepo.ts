import { DBProvider } from "../../../infraproviders/DBProvider";
import { Transaction, TransactionProps } from "../domain/Transaction";
import { TransactionMapper } from "../mapper/TransactionMapper";
import { ITransactionRepo } from "./TransactionRepo";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { Inject, Injectable } from "@nestjs/common";
import { TransactionStatus } from "../domain/Types";

import { subDays } from "date-fns";
import { TransactionModel } from "../../../infra/mongodb/models/TransactionModel";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

type AggregateResultType = {
  _id: number;
  totalSum: number;
};

@Injectable()
export class MongoDBTransactionRepo implements ITransactionRepo {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly transactionMapper = new TransactionMapper();

  constructor(private readonly dbProvider: DBProvider) { }

  // TODO(#349): Migrate the "sync" Transaction fetching logic to "cursor" based logic.
  async getTransactionsBeforeTime(time: number, status: TransactionStatus): Promise<Transaction[]> {
    this.logger.info(
      `Fetching all pending transaction with status "${status}" which are updated ` +
      ` before "${time}" (i.e. ${(Date.now().valueOf() - time) / 1000} seconds ago).`);

    const transactionModel = await this.dbProvider.getTransactionModel();
    const results = await transactionModel
      .find({
        transactionStatus: status,
        lastUpdatedTimestamp: {
          $lte: time,
        },
      });

    this.logger.info(
      `Fetched ${results.length} transactions with status "${status}" which are updated ` +
      ` before "${time}" (i.e. ${(Date.now().valueOf() - time) / 1000} seconds ago).`);

    return results.map(x => this.transactionMapper.toDomain(convertDBResponseToJsObject(x)));
  }

  async getAll(): Promise<Transaction[]> {
    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel.find().exec();
    const transactionPropsList: TransactionProps[] = convertDBResponseToJsObject(result);
    return transactionPropsList.map(transactionResult => this.transactionMapper.toDomain(transactionResult));
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel.findById(transactionId).exec();
    const transactionProps: TransactionProps = convertDBResponseToJsObject(result);
    return this.transactionMapper.toDomain(transactionProps);
  }

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    // Date.now() will give you the same UTC timestamp independent of your current timezone. 
    // Such a timestamp, rather a point in time, does not depend on timezones.
    transaction.props.lastUpdatedTimestamp = Date.now().valueOf();

    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel.create(transaction.props);
    const transactionProps: TransactionProps = convertDBResponseToJsObject(result);
    return this.transactionMapper.toDomain(transactionProps);
  }

  async updateTransaction(transaction: Transaction): Promise<Transaction> {
    // Date.now() will give you the same UTC timestamp independent of your current timezone. 
    // Such a timestamp, rather a point in time, does not depend on timezones.
    transaction.props.lastUpdatedTimestamp = Date.now().valueOf();

    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel.findByIdAndUpdate(transaction.props._id, transaction.props).exec();
    const transactionProps: TransactionProps = convertDBResponseToJsObject(result);
    return this.transactionMapper.toDomain(transactionProps);
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: any = await transactionModel.find({ userId: userId }).exec();
    const transactionPropsList: TransactionProps[] = convertDBResponseToJsObject(result);
    return transactionPropsList.map(userTransaction => this.transactionMapper.toDomain(userTransaction));
  }

  private async getPeriodicUserTransactionAmount(userId: string, days: number): Promise<number> {
    const dateToCheck = subDays(new Date(), days);
    const transactionModel = await this.dbProvider.getTransactionModel();
    const result: AggregateResultType[] = await transactionModel
      .aggregate([
        {
          $match: {
            userId: userId,
            transactionStatus: TransactionStatus.COMPLETED, // TODO: What about other in-flight statuses?
            transactionTimestamp: {
              $gt: dateToCheck,
            },
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

    console.log(`Returning transactions totalling ${result[0].totalSum} since ${dateToCheck}`);
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

    const result: any = await query.sort({ transactionTimestamp: "asc" }).exec();
    const transactionPropsList: TransactionProps[] = convertDBResponseToJsObject(result);
    return transactionPropsList.map(userTransaction => this.transactionMapper.toDomain(userTransaction));
  }
}
