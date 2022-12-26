import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";

export const createTestConsumer = async (prismaService: PrismaService): Promise<string> => {
  const savedConsumer = await prismaService.consumer.create({
    data: {
      firstName: "Test",
      lastName: "Consumer",
      email: `${uuid()}@noba.com`,
      displayEmail: `${uuid()}@noba.com`,
      handle: `${Date.now().valueOf()}`,
    },
  });

  return savedConsumer.id;
};
