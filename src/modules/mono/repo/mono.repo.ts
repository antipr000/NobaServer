import { MonoTransaction, MonoTransactionSaveRequest, MonoTransactionUpdateRequest } from "../domain/Mono";

export interface IMonoRepo {
  createMonoTransaction(request: MonoTransactionSaveRequest): Promise<MonoTransaction>;
  updateMonoTransaction(id: string, request: MonoTransactionUpdateRequest): Promise<MonoTransaction>;
  // updateMonoTransaction(monoCollectionLinkID: string, request: MonoTransactionUpdateRequest): Promise<MonoTransaction>;
  getMonoTransactionByNobaTransactionID(nobaTransactionID: string): Promise<MonoTransaction>;
  getMonoTransactionByCollectionLinkID(collectionLinkID: string): Promise<MonoTransaction>;
  getMonoTransactionByTransferID(transferID: string): Promise<MonoTransaction>;
}
