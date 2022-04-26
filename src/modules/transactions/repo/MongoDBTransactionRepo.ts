import { Result } from "../../../core/logic/Result";
import { TransactionModel } from "../../../infra/mongodb/models/TransactionModel";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { Transaction, TransactionProps } from "../domain/Transaction";
import { TransactionMapper } from "../mapper/TransactionMapper";
import { ITransactionRepo } from "./TransactionRepo";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { getWeek } from "../../../core/utils/DateUtils";

type AggregateResultType = {
    _id: number,
    totalSum: number;
};

export class MongoDBTransactionRepo implements ITransactionRepo {

    private readonly transactionMapper = new TransactionMapper();

    constructor( private readonly dbProvider: DBProvider) { 
    }

    async getAll(): Promise<Transaction[]> {
        const result: any = await TransactionModel.find().exec();
        const transactionPropsList: TransactionProps[] = convertDBResponseToJsObject(result);
        return transactionPropsList.map(transactionResult => this.transactionMapper.toDomain(transactionResult));
    }

    async getTransaction(transactionId: string): Promise<Transaction> {
        const result: any = await TransactionModel.findById(transactionId).exec();
        const transactionProps: TransactionProps = convertDBResponseToJsObject(result);
        return this.transactionMapper.toDomain(transactionProps);
    }

    async createTransaction(transaction: Transaction): Promise<Transaction> {
        const result: any = await TransactionModel.create(transaction.props);
        const transactionProps: TransactionProps = convertDBResponseToJsObject(result);
        return this.transactionMapper.toDomain(transactionProps);
    }

    async updateTransaction(transaction: Transaction): Promise<Transaction> {
        const result: any = await TransactionModel.findByIdAndUpdate(transaction.props._id, transaction.props).exec();
        const transactionProps: TransactionProps = convertDBResponseToJsObject(result);
        return this.transactionMapper.toDomain(transactionProps);
    }

    async getUserTransactions(userId: string): Promise<Transaction[]> {
        const result: any = await TransactionModel.find({ "userId": userId }).exec();
        const transactionPropsList: TransactionProps[] = convertDBResponseToJsObject(result);
        return transactionPropsList.map(userTransaction => this.transactionMapper.toDomain(userTransaction));
    }

    async getTotalUserTransactionAmount(userId: string): Promise<number> {
        const result: AggregateResultType[] = await TransactionModel.aggregate([{
            $match: {
               userId: userId 
            }
        },{
            $group: {
                "_id": 1,
                "totalSum": {
                    $sum: "$leg1Amount"
                }
            }
        }]).exec();
        if(result.length === 0) return 0;
        return result[0].totalSum;
    }

    async getMonthlyUserTransactionAmount(userId: string): Promise<number> {
        const month: number = new Date().getUTCMonth() + 1;
        const year: number = new Date().getUTCFullYear();
        const result: AggregateResultType[] = await TransactionModel.aggregate([{
            $addFields: {
                month: {
                    $month: {
                        $toDate: "$transactionTimestamp"
                    }
                },
                year: {
                    $year: {
                        $toDate: "$transactionTimestamp"
                    }
                }
            }
        },{
            $match: {
                userId: userId,
                month: month,
                year: year
            }
        }, {
            $group: {
                "_id": 1,
                "totalSum": {
                    $sum: "$leg1Amount"
                }
            }
        }]).exec();
        if(result.length === 0) return 0;
        return result[0].totalSum;
    }

    async getWeeklyUserTransactionAmount(userId: string): Promise<number> {
        const week: number = getWeek(new Date());
        const year: number = new Date().getUTCFullYear();
        const result: AggregateResultType[] = await TransactionModel.aggregate([{
            $addFields: {
                week: {
                    $week: {
                        $toDate: "$transactionTimestamp"
                    }
                },
                year: {
                    $year: {
                        $toDate: "$transactionTimestamp"
                    }
                }
            }
        },{
            $match: {
                userId: userId,
                week: week,
                year: year
            }
        }, {
            $group: {
                "_id": 1,
                "totalSum": {
                    $sum: "$leg1Amount"
                }
            }
        }]).exec();
        if(result.length === 0) return 0;
        return result[0].totalSum;
    }

    async getDailyUserTransactionAmount(userId: string): Promise<number> {
        const day: number = new Date().getUTCDate();
        const year: number = new Date().getUTCFullYear();
        const result: AggregateResultType[] = await TransactionModel.aggregate([{
            $addFields: {
                day: {
                    $dayOfMonth: {
                        $toDate: "$transactionTimestamp"
                    }
                },
                year: {
                    $year: {
                        $toDate: "$transactionTimestamp"
                    }
                }
            }
        },{
            $match: {
                userId: userId,
                day: day,
                year: year
            }
        }, {
            $group: {
                "_id": 1,
                "totalSum": {
                    $sum: "$leg1Amount"
                }
            }
        }]).exec();
        if(result.length === 0) return 0;
        return result[0].totalSum;
    }
}