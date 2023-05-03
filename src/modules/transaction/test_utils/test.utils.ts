import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { createTestConsumer } from "../../consumer/test_utils/test.utils";
import { TransactionStatus, WorkflowName } from "../domain/Transaction";

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
