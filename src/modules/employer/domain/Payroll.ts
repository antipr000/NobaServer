import Joi from "joi";
import { Payroll as PrismaPayrollModel } from "@prisma/client";
import { KeysRequired } from "../../common/domain/Types";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";

export enum PayrollStatus {
  CREATED = "CREATED",
  INVOICED = "INVOICED",
  PREPARED = "PREPARED",
  INVESTIGATION = "INVESTIGATION",
  FUNDED = "FUNDED",
  IN_PROGRESS = "IN_PROGRESS",
  RECEIPT = "RECEIPT",
  COMPLETED = "COMPLETED",
  EXPIRED = "EXPIRED",
}

export const isStatusTransitionAllowed = (oldStatus: PayrollStatus, newStatus: PayrollStatus) => {
  switch (newStatus) {
    case PayrollStatus.CREATED:
      // We should not receive updates for CREATED
      return false;
    case PayrollStatus.PREPARED:
      // For prepared we allow status updates from CREATED
      return oldStatus === PayrollStatus.CREATED;
    case PayrollStatus.INVOICED:
      // For invoiced we allow status updates from PREPARED only
      return oldStatus === PayrollStatus.PREPARED;
    case PayrollStatus.INVESTIGATION:
      // For investigation we allow status updates from INVOICED or FUNDED
      return oldStatus === PayrollStatus.INVOICED || oldStatus === PayrollStatus.FUNDED;
    case PayrollStatus.FUNDED:
      // As funded is from a webhook event, we will only disallow status updates from IN_PROGRESS, COMPLETED and EXPIRED
      return (
        oldStatus !== PayrollStatus.IN_PROGRESS &&
        oldStatus !== PayrollStatus.RECEIPT &&
        oldStatus !== PayrollStatus.COMPLETED &&
        oldStatus !== PayrollStatus.EXPIRED
      );
    case PayrollStatus.IN_PROGRESS:
      // For in_progress we should allow status updates from FUNDED
      return oldStatus === PayrollStatus.FUNDED;
    case PayrollStatus.RECEIPT:
      return oldStatus === PayrollStatus.IN_PROGRESS;
    case PayrollStatus.COMPLETED:
      // For completed we allow status updates from IN_PROGRESS
      return oldStatus === PayrollStatus.RECEIPT;
    case PayrollStatus.EXPIRED:
      // For expired we allow status updates from CREATED and INVOICED and INVESTIGATION
      return (
        oldStatus === PayrollStatus.CREATED ||
        oldStatus === PayrollStatus.INVOICED ||
        oldStatus === PayrollStatus.INVESTIGATION
      );
    default:
      throw new ServiceException({
        message: `Invalid payroll status ${newStatus}`,
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
  }
};

export class Payroll {
  id: string;
  employerID: string;
  referenceNumber?: number;
  payrollDate: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
  completedTimestamp?: Date;
  totalDebitAmount?: number;
  totalCreditAmount?: number;
  exchangeRate?: number;
  debitCurrency?: string;
  creditCurrency?: string;
  paymentMonoTransactionID: string;
  status: PayrollStatus;
}

export class PayrollCreateRequest {
  employerID: string;
  payrollDate: string;
  totalDebitAmount?: number;
  totalCreditAmount?: number;
  exchangeRate?: number;
  debitCurrency?: string;
  creditCurrency?: string;
}

export class PayrollUpdateRequest {
  completedTimestamp?: Date;
  status?: PayrollStatus;
  totalDebitAmount?: number;
  totalCreditAmount?: number;
  exchangeRate?: number;
  debitCurrency?: string;
  creditCurrency?: string;
  paymentMonoTransactionID?: string;
}

export const validateCreatePayrollRequest = (payroll: PayrollCreateRequest) => {
  const payrollJoiValidationKeys: KeysRequired<PayrollCreateRequest> = {
    employerID: Joi.string().required(),
    payrollDate: Joi.string().required(),
    totalDebitAmount: Joi.number().optional(),
    totalCreditAmount: Joi.number().optional(),
    exchangeRate: Joi.number().optional(),
    debitCurrency: Joi.string().optional(),
    creditCurrency: Joi.string().optional(),
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
    totalDebitAmount: Joi.number().optional(),
    totalCreditAmount: Joi.number().optional(),
    exchangeRate: Joi.number().optional(),
    debitCurrency: Joi.string().optional(),
    creditCurrency: Joi.string().optional(),
    paymentMonoTransactionID: Joi.string().optional(),
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
    referenceNumber: Joi.number().required(),
    payrollDate: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
    completedTimestamp: Joi.date().optional().allow(null),
    totalDebitAmount: Joi.number().optional().allow(null),
    totalCreditAmount: Joi.number().optional().allow(null),
    exchangeRate: Joi.number().optional().allow(null),
    debitCurrency: Joi.string().optional().allow(null),
    creditCurrency: Joi.string().optional().allow(null),
    paymentMonoTransactionID: Joi.string().optional().allow(null),
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
    referenceNumber: payroll.referenceNumber,
    payrollDate: payroll.payrollDate,
    createdTimestamp: payroll.createdTimestamp,
    updatedTimestamp: payroll.updatedTimestamp,
    paymentMonoTransactionID: payroll.paymentMonoTransactionID,
    ...(payroll.completedTimestamp && { completedTimestamp: payroll.completedTimestamp }),
    ...(payroll.totalDebitAmount && { totalDebitAmount: payroll.totalDebitAmount }),
    ...(payroll.totalCreditAmount && { totalCreditAmount: payroll.totalCreditAmount }),
    ...(payroll.exchangeRate && { exchangeRate: payroll.exchangeRate }),
    ...(payroll.debitCurrency && { debitCurrency: payroll.debitCurrency }),
    ...(payroll.creditCurrency && { creditCurrency: payroll.creditCurrency }),
    status: payroll.status as PayrollStatus,
  };
};

export type PayrollFilter = {
  status?: PayrollStatus;
};
