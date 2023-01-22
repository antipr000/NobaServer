import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";

export const createTestEmployer = async (prismaService: PrismaService): Promise<string> => {
  const savedEmployer = await prismaService.employer.create({
    data: {
      name: uuid(),
      bubbleID: uuid(),
      logoURI: "https://www.google.com",
      referralID: uuid(),
    },
  });

  return savedEmployer.id;
};
