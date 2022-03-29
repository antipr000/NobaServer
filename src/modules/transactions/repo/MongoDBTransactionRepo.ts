import { Result } from "../../../core/logic/Result";
import { TransactionModel } from "../../../infra/mongodb/models/TransactionModel";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { Transaction, TransactionProps } from "../domain/Transaction";
import { TransactionMapper } from "../mapper/TransactionMapper";
import { ITransactionRepo } from "./TransactionRepo";

export class MongoDBTransactionRepo implements ITransactionRepo {

    private readonly transactionMapper = new TransactionMapper();

    constructor( private readonly dbProvider: DBProvider) { 
    }

    async getAll(): Promise<Transaction[]> {
        const result: TransactionProps[] = await TransactionModel.find().exec();
        return result.map(transactionResult => this.transactionMapper.toDomain(transactionResult));
    }

    async getTransaction(transactionId: string): Promise<Transaction> {
        const result: TransactionProps = await TransactionModel.findById(transactionId).exec();
        return this.transactionMapper.toDomain(result);
    }

    async createTransaction(transaction: Transaction): Promise<Transaction> {
        const transactionProps = await TransactionModel.create(transaction.props);
        return this.transactionMapper.toDomain(transactionProps);
    }

    async updateTransaction(transaction: Transaction): Promise<Transaction> {
        const transactionProps = await TransactionModel.findByIdAndUpdate(transaction.props._id, transaction.props).exec();
        return this.transactionMapper.toDomain(transactionProps);
    }

    async getUserTransactions(userId: string): Promise<Transaction[]> {
        const result: TransactionProps[] = await TransactionModel.find({ "userId": userId });
        return result.map(userTransaction => this.transactionMapper.toDomain(userTransaction));
    }
}