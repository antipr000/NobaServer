import { uuid } from "uuidv4";
import { MonoTransaction, MonoTransactionState, MonoTransactionType } from "../../domain/Mono";

export const getRandomMonoTransaction = (
  type: MonoTransactionType = MonoTransactionType.COLLECTION_LINK_DEPOSIT,
): MonoTransaction => {
  switch (type) {
    case MonoTransactionType.WITHDRAWAL:
      return {
        id: uuid(),
        type: MonoTransactionType.WITHDRAWAL,
        state: MonoTransactionState.PENDING,
        nobaTransactionID: uuid(),
        withdrawalDetails: {
          transferID: uuid(),
          batchID: uuid(),
        },
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

    case MonoTransactionType.COLLECTION_LINK_DEPOSIT:
      return {
        id: uuid(),
        type: MonoTransactionType.WITHDRAWAL,
        state: MonoTransactionState.PENDING,
        nobaTransactionID: uuid(),
        collectionLinkDepositDetails: {
          collectionLinkID: uuid(),
          collectionURL: `https://mono.com/collections/${uuid()}`,
        },
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

    default:
      throw new Error(`Unsupported transaction type: ${type}`);
  }
};
