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
      payrollDates: ["2020-02-29", "2020-03-01", "2020-03-02"],
    },
  });

  return savedEmployer.id;
};
