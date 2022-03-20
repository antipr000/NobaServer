import { Transaction } from "../domain/Transaction";
import { Mapper } from '../../../core/infra/Mapper';
import { TransactionDTO } from "../dto/TransactionDTO";

export class TransactionMapper  implements Mapper<Transaction>{
    
   
    toPersistence(t: any, options: any) {
        throw new Error("Method not implemented.");
    }


    toDTO(t: Transaction): TransactionDTO {
        const props = t.props;
        return {
            id: props.id,
            status: props.transactionStatus,
            leg1: props.leg1,
            leg2: props.leg2,
            leg1Amount: props.leg1Amount,
            leg2Amount: props.leg2Amount,
        }
    }
  

    toDomain(t: any): Transaction {
        return Transaction.createTransaction(t); 
    }

}