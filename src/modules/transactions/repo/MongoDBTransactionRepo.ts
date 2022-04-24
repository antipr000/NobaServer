import { Result } from "../../../core/logic/Result";
import { TransactionModel } from "../../../infra/mongodb/models/TransactionModel";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { Transaction, TransactionProps } from "../domain/Transaction";
import { TransactionMapper } from "../mapper/TransactionMapper";
import { ITransactionRepo } from "./TransactionRepo";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";

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
        const result: any = await TransactionModel.find({ "userId": userId });
        const transactionPropsList: TransactionProps[] = convertDBResponseToJsObject(result);
        return transactionPropsList.map(userTransaction => this.transactionMapper.toDomain(userTransaction));
    }
}