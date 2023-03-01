import { uuid } from "uuidv4";
import { Payroll, PayrollCreateRequest, PayrollStatus, convertToDomainPayroll } from "../domain/Payroll";
import { createTestEmployerAndStoreInDB } from "../../test_utils/test.utils";
import { PrismaService } from "../../../../infraproviders/PrismaService";

export const getRandomPayroll = (
  employerID: string,
): { payroll: Payroll; payrollCreateInput: PayrollCreateRequest } => {
  const payroll: Payroll = {
    id: uuid(),
    reference: uuid(),
    employerID: employerID,
    payrollDate: "2023-03-01",
    createdTimestamp: new Date("2023-02-20"),
    updatedTimestamp: new Date("2023-02-20"),
    totalDebitAmount: 10000,
    totalCreditAmount: 10,
    exchangeRate: 1000,
    debitCurrency: "COP",
    creditCurrency: "USD",
    status: PayrollStatus.CREATED,
  };

  const payrollCreateInput: PayrollCreateRequest = {
    employerID: employerID,
    reference: payroll.reference,
    payrollDate: payroll.payrollDate,
    totalDebitAmount: payroll.totalDebitAmount,
    totalCreditAmount: payroll.totalCreditAmount,
    exchangeRate: payroll.exchangeRate,
    debitCurrency: payroll.debitCurrency,
    creditCurrency: payroll.creditCurrency,
  };

  return {
    payroll,
    payrollCreateInput,
  };
};

export const saveAndGetPayroll = async (prismaService: PrismaService, employerID?: string): Promise<Payroll> => {
  employerID = employerID ?? (await createTestEmployerAndStoreInDB(prismaService));
  const createdPayroll = await prismaService.payroll.create({
    data: {
      id: uuid(),
      reference: uuid(),
      employerID: employerID,
      payrollDate: "2023-03-01",
      createdTimestamp: new Date("2023-02-20"),
      updatedTimestamp: new Date("2023-02-20"),
      totalDebitAmount: 10000,
      totalCreditAmount: 10,
      exchangeRate: 1000,
      debitCurrency: "COP",
      creditCurrency: "USD",
      status: PayrollStatus.CREATED,
    },
  });

  return convertToDomainPayroll(createdPayroll);
};
