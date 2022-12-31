import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { Utils } from "../../../core/utils/Utils";

export const createTestConsumer = async (prismaService: PrismaService): Promise<string> => {
  const savedConsumer = await prismaService.consumer.create({
    data: {
      firstName: "Test",
      lastName: "Consumer",
      email: `${uuid()}@noba.com`,
      displayEmail: `${uuid()}@noba.com`,
      handle: `${Date.now().valueOf()}`,
      referralCode: Utils.getAlphaNanoID(15),
    },
  });

  return savedConsumer.id;
};
