import Joi from "joi";
import { Payroll as PrismaPayrollModel } from "@prisma/client";
import { KeysRequired } from "../../../../modules/common/domain/Types";

export enum PayrollStatus {
  CREATED = "Created",
  INVOICED = "Invoiced",
  INVESTIGATION = "Investigation",
  FUNDED = "Funded",
  IN_PROGRESS = "InProgress",
  COMPLETE = "Complete",
  EXPIRED = "Expired",
}

export class Payroll {
  id: string;
  employerID: string;
  reference: string;
  payrollDate: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
  completedTimestamp?: Date;
  totalDebitAmount: number;
  totalCreditAmount: number;
  exchangeRate: number;
  debitCurrency: string;
  creditCurrency: string;
  status: PayrollStatus;
}

export class PayrollCreateRequest {
  employerID: string;
  reference: string;
  payrollDate: string;
  totalDebitAmount: number;
  totalCreditAmount: number;
  exchangeRate: number;
  debitCurrency: string;
  creditCurrency: string;
}

export class PayrollUpdateRequest {
  completedTimestamp?: Date;
  status?: PayrollStatus;
}

export const validateCreatePayrollRequest = (payroll: PayrollCreateRequest) => {
  const payrollJoiValidationKeys: KeysRequired<PayrollCreateRequest> = {
    employerID: Joi.string().required(),
    reference: Joi.string().required(),
    payrollDate: Joi.string().required(),
    totalDebitAmount: Joi.number().required(),
    totalCreditAmount: Joi.number().required(),
    exchangeRate: Joi.number().required(),
    debitCurrency: Joi.string().required(),
    creditCurrency: Joi.string().required(),
  };

  const payrollJoiSchema = Joi.object(payrollJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(payroll, payrollJoiSchema);
};

export const validateUpdatePayrollRequest = (payroll: PayrollUpdateRequest) => {
  const payrollJoiValidationKeys: KeysRequired<PayrollUpdateRequest> = {
    completedTimestamp: Joi.date().optional(),
    status: Joi.string()
      .optional()
      .valid(...Object.values(PayrollStatus)),
  };

  const payrollJoiSchema = Joi.object(payrollJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(payroll, payrollJoiSchema);
};

export const validatePayroll = (payroll: Payroll) => {
  const payrollJoiValidationKeys: KeysRequired<Payroll> = {
    id: Joi.string().required(),
    employerID: Joi.string().required(),
    reference: Joi.string().required(),
    payrollDate: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
    completedTimestamp: Joi.date().optional(),
    totalDebitAmount: Joi.number().required(),
    totalCreditAmount: Joi.number().required(),
    exchangeRate: Joi.number().required(),
    debitCurrency: Joi.string().required(),
    creditCurrency: Joi.string().required(),
    status: Joi.string()
      .required()
      .valid(...Object.values(PayrollStatus)),
  };

  const payrollJoiSchema = Joi.object(payrollJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(payroll, payrollJoiSchema);
};

export const convertToDomainPayroll = (payroll: PrismaPayrollModel): Payroll => {
  return {
    id: payroll.id,
    employerID: payroll.employerID,
    reference: payroll.reference,
    payrollDate: payroll.payrollDate,
    createdTimestamp: payroll.createdTimestamp,
    updatedTimestamp: payroll.updatedTimestamp,
    ...(payroll.completedTimestamp && { completedTimestamp: payroll.completedTimestamp }),
    totalDebitAmount: payroll.totalDebitAmount,
    totalCreditAmount: payroll.totalCreditAmount,
    exchangeRate: payroll.exchangeRate,
    debitCurrency: payroll.debitCurrency,
    creditCurrency: payroll.creditCurrency,
    status: payroll.status as PayrollStatus,
  };
};

export type PayrollFilter = {
  status?: PayrollStatus;
};
