import { TransactionStatsDTO } from "../../dto/TransactionStats";
import { TransactionModel } from "../../../../infra/mongodb/models/TransactionModel";
import { Transaction, TransactionProps } from "../../../../modules/transactions/domain/Transaction";
import { convertDBResponseToJsObject } from "src/infra/mongodb/MongoDBUtils";
import { Injectable } from "@nestjs/common";

export interface IAdminTransactionRepo {
    getTransactionStats(): Promise<TransactionStatsDTO>;
    getAllTransactions(startDate: string, endDate: string): Promise<Transaction[]>;
}

type AggregateTransactionType = {
    _id: number;
    totalSum: number;
    count: number;
};

@Injectable()
export class MongoDBAdminTransactionRepo implements IAdminTransactionRepo {

    async getAllTransactions(startDate: string, endDate: string): Promise<Transaction[]> {
        const result: any = await TransactionModel.find({
            "transactionTimestamp": {
                "$gte": new Date(startDate),
                "$lte": new Date(endDate)
            }
        });
        const transactions: TransactionProps[] = convertDBResponseToJsObject(result);
        return transactions.map(transaction => Transaction.createTransaction(transaction));
    }

    async getTransactionStats(): Promise<TransactionStatsDTO> {
        const result: AggregateTransactionType[] = await TransactionModel.aggregate([
            {
                "$group": {
                    "_id": 1,
                    "totalSum": {
                        $sum: "$leg1Amount"
                    },
                    "count": {
                        $sum: 1
                    }
                }
            }
        ]);

        return {
            numTransactions: result[0].totalSum,
            totalAmount: result[0].count
        };
    }
}