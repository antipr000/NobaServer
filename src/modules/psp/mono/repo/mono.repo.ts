import { MonoTransaction, MonoTransactionCreateRequest, MonoTransactionUpdateRequest } from "../../domain/Mono";

export interface IMonoRepo {
  createMonoTransaction(request: MonoTransactionCreateRequest): Promise<MonoTransaction>;
  updateMonoTransaction(id: string, request: MonoTransactionUpdateRequest): Promise<MonoTransaction>;
  // updateMonoTransaction(monoCollectionLinkID: string, request: MonoTransactionUpdateRequest): Promise<MonoTransaction>;
  getMonoTransactionByNobaTransactionID(nobaTransactionID: string): Promise<MonoTransaction>;
  getMonoTransactionByCollectionLinkID(collectionLinkID: string): Promise<MonoTransaction>;
}
