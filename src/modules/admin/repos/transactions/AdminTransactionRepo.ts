import { TransactionStatsDTO } from "../../dto/TransactionStats";
import { TransactionModel } from "../../../../infra/mongodb/models/TransactionModel";
import { AdminModel } from '../../../../infra/mongodb/models/AdminModel';
import { Transaction, TransactionProps } from "../../../../modules/transactions/domain/Transaction";
import { convertDBResponseToJsObject } from "../../../../../src/infra/mongodb/MongoDBUtils";
import { Inject, Injectable } from "@nestjs/common";
import { Admin, AdminProps } from '../../domain/Admin';
import { AdminMapper } from "../../mappers/AdminMapper";

export interface IAdminTransactionRepo {
    getTransactionStats(): Promise<TransactionStatsDTO>;
    getAllTransactions(startDate: string, endDate: string): Promise<Transaction[]>;
    addNobaAdmin(nobaAdmin: Admin): Promise<Admin>;
    getNobaAdminByEmail(email: string): Promise<Admin>;
    updateNobaAdmin(updatedNobaAdmin: Admin): Promise<Admin>;
}

type AggregateTransactionType = {
    _id: number;
    totalSum: number;
    count: number;
};

@Injectable()
export class MongoDBAdminTransactionRepo implements IAdminTransactionRepo {

    @Inject()
    private readonly adminMapper: AdminMapper;

    // TODO: Add unit tests
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

    // TODO: Add unit tests
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

    async addNobaAdmin(nobaAdmin: Admin): Promise<Admin> {
        const result = await AdminModel.create(nobaAdmin.props);
        const nobaAdminProps: AdminProps = convertDBResponseToJsObject(result);
        return this.adminMapper.toDomain(nobaAdminProps);
    }

    async getNobaAdminByEmail(email: string): Promise<Admin> {
        console.log('Find by email: ', email);
        const result: any = await AdminModel.find({
            email: email
        });
        const nobaAdminProps: AdminProps[] = convertDBResponseToJsObject(result);

        if (nobaAdminProps.length === 0) return undefined;
        return this.adminMapper.toDomain(nobaAdminProps);
    }

    async updateNobaAdmin(updatedNobaAdmin: Admin): Promise<Admin> {
        const result = await AdminModel.updateOne(
            { _id: updatedNobaAdmin.props._id },
            updatedNobaAdmin
        );
        const nobaAdminProps: AdminProps = convertDBResponseToJsObject(result);

        return this.adminMapper.toDomain(nobaAdminProps);
    }
}