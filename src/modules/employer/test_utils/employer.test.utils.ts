import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { convertToDomainEmployer, Employer, EmployerCreateRequest } from "../domain/Employer";

export const saveAndGetEmployer = async (prismaService: PrismaService): Promise<Employer> => {
  const employerCreateInput: EmployerCreateRequest = {
    bubbleID: uuid(),
    leadDays: 3,
    logoURI: "https://www.google.com",
    name: "Test Employer",
    depositMatchingName: "Deposit Employer Name",
    payrollDates: ["2021-01-01", "2021-01-02"],
    referralID: uuid(),
    maxAllocationPercent: 100,
    payrollAccountNumber: "123456789",
  };

  const employer = await prismaService.employer.create({ data: employerCreateInput });

  return convertToDomainEmployer(employer);
};

export const saveEmployer = async (employer: Employer, prismaService: PrismaService): Promise<Employer> => {
  return convertToDomainEmployer(
    await prismaService.employer.create({
      data: {
        id: employer.id,
        bubbleID: employer.bubbleID,
        leadDays: employer.leadDays,
        logoURI: employer.logoURI,
        name: employer.name,
        depositMatchingName: employer.depositMatchingName,
        payrollDates: employer.payrollDates,
        referralID: employer.referralID,
        documentNumber: employer.documentNumber,
        maxAllocationPercent: employer.maxAllocationPercent,
        payrollAccountNumber: employer.payrollAccountNumber,
      },
    }),
  );
};

export const getRandomEmployer = (name: string): Employer => {
  return {
    id: uuid(),
    bubbleID: uuid(),
    leadDays: 3,
    logoURI: "https://www.google.com",
    name: name || "Test Employer",
    depositMatchingName: name ? `Deposit ${name}` : "Deposit Test Employer",
    payrollDates: ["2021-01-01", "2021-01-02"],
    referralID: uuid(),
    documentNumber: uuid(),
    maxAllocationPercent: 100,
    payrollAccountNumber: "123456789",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };
};
