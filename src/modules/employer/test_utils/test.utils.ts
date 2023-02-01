import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";

export const createTestEmployer = async (prismaService: PrismaService): Promise<string> => {
  const savedEmployer = await prismaService.employer.create({
    data: {
      name: uuid(),
      bubbleID: uuid(),
      logoURI: "https://www.google.com",
      referralID: uuid(),
      leadDays: 1,
      payrollDates: [
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(Date.now()),
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      ],
    },
  });

  return savedEmployer.id;
};
