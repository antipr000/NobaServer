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
      workflowName: WorkflowName.CREDIT_CONSUMER_WALLET,
      creditAmount: 100,
      creditCurrency: "USD",
      creditConsumer: {
        connect: {
          id: consumerID,
        }
      },
      status: TransactionStatus.IN_PROGRESS,
    },
  });

  return savedNobaTransaction.id;
};
