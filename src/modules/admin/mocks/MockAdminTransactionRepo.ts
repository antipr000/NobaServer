import { anyString, anything, mock, when } from "ts-mockito";
import { IAdminTransactionRepo, MongoDBAdminTransactionRepo } from "../repos/transactions/AdminTransactionRepo";

export const getMockAdminTransactionRepoWithDefaults = () => {
    const mockAdminTransactionRepo: IAdminTransactionRepo = mock(MongoDBAdminTransactionRepo);

    when(mockAdminTransactionRepo.getTransactionStats())
        .thenReject(new Error('Not implemented!'));
    when(mockAdminTransactionRepo.getAllTransactions(anyString(), anyString()))
        .thenReject(new Error('Not implemented!'));
    when(mockAdminTransactionRepo.addNobaAdmin(anything()))
        .thenReject(new Error('Not implemented!'));
    when(mockAdminTransactionRepo.updateNobaAdmin(anything()))
        .thenReject(new Error('Not implemented!'));
    when(mockAdminTransactionRepo.getNobaAdminByEmail(anyString()))
        .thenReject(new Error('Not implemented!'));
    when(mockAdminTransactionRepo.deleteNobaAdmin(anyString()))
        .thenReject(new Error('Not implemented!'));

    return mockAdminTransactionRepo;
}
