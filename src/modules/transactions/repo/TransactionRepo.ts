import { Transaction } from "../domain/Transaction";

export interface ITransactionRepo {
    getAll(): Promise<Transaction[]>;//this is to be used by app admins. TODO pagination? transaction filter options?
    getTransaction(transactionId: string): Promise<Transaction>;
    createTransaction(transaction: Transaction): Promise<Transaction>;
    updateTransaction(transaction: Transaction): Promise<Transaction>;
    getUserTransactions(userId: string): Promise<Transaction[]>; //TODO pagination? transaction filter options?
    getUserTransactionInAnInterval(userId: string, fromDate: Date, toDate: Date): Promise<Transaction[]>;
    getTotalUserTransactionAmount(userId: string): Promise<number>;
    getMonthlyUserTransactionAmount(userId: string): Promise<number>;
    getWeeklyUserTransactionAmount(userId: string): Promise<number>;
    getDailyUserTransactionAmount(userId: string): Promise<number>;
}

//TODO create mongodb or dynamodb repository? //We should use Mongodb as transaction api requires a lot of indexing and querying. (query by userID, transactionID, transactionStatus,merchantID,lookup by stripe payment id, last 100 etc)
export class MockTransactionRepo implements ITransactionRepo {
    getTotalUserTransactionAmount(userId: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getMonthlyUserTransactionAmount(userId: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getWeeklyUserTransactionAmount(userId: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getDailyUserTransactionAmount(userId: string): Promise<number> {
        throw new Error("Method not implemented.");
    }

    getUserTransactionInAnInterval(userId: string, fromDate: Date, toDate: Date): Promise<Transaction[]> {
        throw new Error("Method not implemented.");
    }

    private readonly allTransactions: { [transactionId: string]: Transaction } = {};

    async getAll(): Promise<Transaction[]> {
        return Object.values(this.allTransactions);
    }

    async getTransaction(transactionId: string): Promise<Transaction> {
        return this.allTransactions[transactionId];
    }

    async createTransaction(transaction: Transaction): Promise<Transaction> {
        this.allTransactions[transaction.props._id] = transaction;
        return transaction;
    }

    async updateTransaction(transaction: Transaction): Promise<Transaction> {
        this.allTransactions[transaction.props._id] = transaction;
        return transaction;
    }

    async getUserTransactions(userId: string): Promise<Transaction[]> {
        return Object.values(this.allTransactions).filter(transaction => transaction.props.userId === userId);
    }
}