export interface IMonoRepo {
  createMonoTransaction(request: MonoTransactionCreateRequest): Promise<MonoTransaction>;
  updateMonoTransaction(nobaTransactionID: string, request: MonoTransactionUpdateRequest): Promise<MonoTransaction>;
  // updateMonoTransaction(monoCollectionLinkID: string, request: MonoTransactionUpdateRequest): Promise<MonoTransaction>;
  getMonoTransactionByNobaTransactionID(nobaTransactionID: string): Promise<MonoTransaction>;
  getMonoTransactionByCollectionLinkID(collectionLinkID: string): Promise<MonoTransaction>;
}
