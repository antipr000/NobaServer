import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { createTestConsumer } from "../../consumer/test_utils/test.utils";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { FeeType } from "../domain/TransactionFee";

export const createTestNobaTransaction = async (prismaService: PrismaService): Promise<string> => {
  const consumerID = await createTestConsumer(prismaService);

  const savedNobaTransaction = await prismaService.transaction.create({
    data: {
      transactionRef: uuid(),
      exchangeRate: 1,
      workflowName: WorkflowName.WALLET_DEPOSIT,
      creditAmount: 100,
      creditCurrency: "USD",
      creditConsumer: {
        connect: {
          id: consumerID,
        },
      },
      status: TransactionStatus.PROCESSING,
      sessionKey: uuid(),
    },
  });

  return savedNobaTransaction.id;
};

export const createTransaction = async ({
  prismaService,
  consumerID,
  creditAmount,
  status,
}: {
  prismaService: PrismaService;
  consumerID: string;
  creditAmount?: number;
  status?: TransactionStatus;
}): Promise<string> => {
  const savedNobaTransaction = await prismaService.transaction.create({
    data: {
      transactionRef: uuid(),
      exchangeRate: 1,
      workflowName: WorkflowName.WALLET_DEPOSIT,
      creditAmount: creditAmount,
      creditCurrency: "USD",
      creditConsumer: {
        connect: {
          id: consumerID,
        },
      },
      status: status,
      sessionKey: uuid(),
    },
  });

  return savedNobaTransaction.id;
};

export const getRandomTransaction = (consumerID: string): Transaction => {
  const transaction: Transaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    status: TransactionStatus.INITIATED,
    workflowName: WorkflowName.WALLET_DEPOSIT,
    id: uuid(),
    sessionKey: uuid(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    debitAmount: 100,
    debitCurrency: "USD",
    debitConsumerID: consumerID,
    transactionFees: [
      {
        amount: 10,
        currency: "USD",
        type: FeeType.NOBA,
        id: uuid(),
        timestamp: new Date(),
      },
    ],
  };
  return transaction;
};
