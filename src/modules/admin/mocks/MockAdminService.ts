import { anyString, anything, mock, when } from "ts-mockito";
import { AdminService } from "../admin.service";

export const getMockAdminServiceWithDefaults = () => {
    const mockAdminService: AdminService = mock(AdminService);

    when(mockAdminService.getTransactionStatus())
        .thenReject(new Error('Not implemented!'));
    when(mockAdminService.getAllTransactions(anyString(), anyString()))
        .thenReject(new Error('Not implemented!'));
    when(mockAdminService.addNobaAdmin(anything()))
        .thenReject(new Error('Not implemented!'));
    when(mockAdminService.changeNobaAdminRole(anything(), anything()))
        .thenReject(new Error('Not implemented!'));
    when(mockAdminService.deleteNobaAdmin(anyString()))
        .thenReject(new Error('Not implemented!'));
    when(mockAdminService.getAdminById(anyString()))
        .thenReject(new Error('Not implemented!'));

    return mockAdminService;
}
