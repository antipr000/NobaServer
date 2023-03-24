import { uuid } from "uuidv4";
import { Payroll, PayrollCreateRequest, PayrollStatus, convertToDomainPayroll } from "../domain/Payroll";
import { createTestEmployerAndStoreInDB } from "./test.utils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import {
  PayrollDisbursement,
  PayrollDisbursementCreateRequest,
  convertToDomainPayrollDisbursement,
} from "../domain/PayrollDisbursement";
import { saveAndGetEmployee } from "../../employee/test_utils/employee.test.utils";

export const getRandomPayroll = (
  employerID: string,
): { payroll: Payroll; payrollCreateInput: PayrollCreateRequest } => {
  const payroll: Payroll = {
    id: uuid(),
    referenceNumber: 1,
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
      referenceNumber: 1,
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

export const getRandomPayrollDisbursement = (
  payrollID: string,
  employeeID: string,
): {
  payrollDisbursement: PayrollDisbursement;
  payrollDisbursementCreateInput: PayrollDisbursementCreateRequest;
} => {
  const payrollDisbursement: PayrollDisbursement = {
    id: uuid(),
    createdTimestamp: new Date("2023-02-20"),
    updatedTimestamp: new Date("2023-02-20"),
    payrollID: payrollID,
    employeeID: employeeID,
    allocationAmount: 10,
    creditAmount: 2,
  };

  const payrollDisbursementCreateInput: PayrollDisbursementCreateRequest = {
    payrollID: payrollID,
    employeeID: employeeID,
    allocationAmount: 10,
  };

  return {
    payrollDisbursement,
    payrollDisbursementCreateInput,
  };
};

export const saveAndGetPayrollDisbursement = async (prismaService: PrismaService): Promise<PayrollDisbursement> => {
  const employee = await saveAndGetEmployee(prismaService);

  const payroll = await saveAndGetPayroll(prismaService, employee.employerID);

  const { payrollDisbursementCreateInput } = getRandomPayrollDisbursement(payroll.id, employee.id);

  const payrollDisbursement = await prismaService.payrollDisbursement.create({ data: payrollDisbursementCreateInput });

  return convertToDomainPayrollDisbursement(payrollDisbursement);
};

export const updatePayrollWithTransactionID = async (
  prismaService: PrismaService,
  payrollDisbursementID: string,
  transactionID: string,
): Promise<PayrollDisbursement> => {
  const payrollDisbursement = await prismaService.payrollDisbursement.update({
    where: {
      id: payrollDisbursementID,
    },
    data: {
      transactionID: transactionID,
    },
  });

  return convertToDomainPayrollDisbursement(payrollDisbursement);
};
