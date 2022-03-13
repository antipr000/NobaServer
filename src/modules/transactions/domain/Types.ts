export enum TransactionStatus {
    FIAT_TRANSFER_PENDING = 'fiat_transfer_pending',
    FIAT_TRANSFER_COMPLETED = 'fiat_transfer_completed',
    FIAT_TRANSFER_FAILED = 'fiat_transfer_failed',
    WALLET_TRANSFER_PROCESSING = 'wallet_transfer_processing',
    WALLET_TRANSFER_COMPLETE = 'wallet_transfer_completed',
    COMPLETED = 'completed',
}