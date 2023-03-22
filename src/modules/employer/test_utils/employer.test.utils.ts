import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { convertToDomainEmployer, Employer, EmployerCreateRequest } from "../domain/Employer";

export const saveAndGetEmployer = async (prismaService: PrismaService): Promise<Employer> => {
  const employerCreateInput: EmployerCreateRequest = {
    bubbleID: uuid(),
    leadDays: 3,
    logoURI: "https://www.google.com",
    name: "Test Employer",
    payrollDates: ["2021-01-01", "2021-01-02"],
    referralID: uuid(),
    maxAllocationPercent: 100,
    payrollAccountNumber: "123456789",
  };

  const employer = await prismaService.employer.create({ data: employerCreateInput });

  return convertToDomainEmployer(employer);
};

export const getRandomEmployer = (name: string): Employer => {
  return {
    id: uuid(),
    bubbleID: uuid(),
    leadDays: 3,
    logoURI: "https://www.google.com",
    name: name || "Test Employer",
    payrollDates: ["2021-01-01", "2021-01-02"],
    referralID: uuid(),
    maxAllocationPercent: 100,
    payrollAccountNumber: "123456789",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };
};
