import { DebitBankRequestDTO } from "../dto/bank.factory.dto";

export interface IBankImpl {
  debit(request: DebitBankRequestDTO): Promise<void>;
}
