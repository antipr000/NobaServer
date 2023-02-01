import { PrismaService } from "../../../infraproviders/PrismaService";
import { v4 } from "uuid";

export const createTestEmployer = async (prismaService: PrismaService): Promise<string> => {
  const savedEmployer = await prismaService.employer.create({
    data: {
      name: v4(),
      bubbleID: v4(),
      logoURI: "https://www.google.com",
      referralID: v4(),
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
