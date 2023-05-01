import Joi from "joi";
import {
  Consumer,
  Employee as PrismaEmployeeModel,
  Transaction as PrismaTransactionModel,
  PayrollDisbursement as PrismaPayrollDisbursementModel,
  Transaction,
} from "@prisma/client";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { TransactionStatus } from "src/modules/transaction/domain/Transaction";

export class PayrollDisbursement {
  id: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
  payrollID: string;
  employeeID: string;
  transactionID?: string;
  allocationAmount: number;
  creditAmount: number;
}

export class EnrichedDisbursement {
  id: string;
  debitAmount: number;
  creditAmount: number;
  status: TransactionStatus;
  firstName: string;
  lastName: string;
  lastUpdated: Date;
}

export class PayrollDisbursementCreateRequest {
  payrollID: string;
  employeeID: string;
  allocationAmount: number;
}

export class PayrollDisbursementUpdateRequest {
  transactionID?: string;
  creditAmount?: number;
}

export const validateCreatePayrollDisbursementRequest = (payrollDisbursement: PayrollDisbursementCreateRequest) => {
  const payrollDisbursementJoiValidationKeys: KeysRequired<PayrollDisbursementCreateRequest> = {
    payrollID: Joi.string().required(),
    employeeID: Joi.string().required(),
    allocationAmount: Joi.number().required(),
  };

  const payrollDisbursementJoiSchema = Joi.object(payrollDisbursementJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(payrollDisbursement, payrollDisbursementJoiSchema);
};

export const validateUpdatePayrollDisbursementRequest = (payrollDisbursement: PayrollDisbursementUpdateRequest) => {
  const payrollDisbursementJoiValidationKeys: KeysRequired<PayrollDisbursementUpdateRequest> = {
    transactionID: Joi.string().optional(),
    creditAmount: Joi.number().required(),
  };

  const payrollDisbursementJoiSchema = Joi.object(payrollDisbursementJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(payrollDisbursement, payrollDisbursementJoiSchema);
};

export const validatePayrollDisbursement = (payrollDisbursement: PayrollDisbursement) => {
  const payrollDisbursementJoiValidationKeys: KeysRequired<PayrollDisbursement> = {
    id: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
    payrollID: Joi.string().required(),
    employeeID: Joi.string().required(),
    transactionID: Joi.string().optional().allow(null),
    allocationAmount: Joi.number().required(),
    creditAmount: Joi.number().optional().allow(null),
  };

  const payrollDisbursementJoiSchema = Joi.object(payrollDisbursementJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(payrollDisbursement, payrollDisbursementJoiSchema);
};

export const convertToDomainPayrollDisbursement = (
  payrollDisbursement: PrismaPayrollDisbursementModel,
): PayrollDisbursement => {
  return {
    id: payrollDisbursement.id,
    createdTimestamp: payrollDisbursement.createdTimestamp,
    updatedTimestamp: payrollDisbursement.updatedTimestamp,
    payrollID: payrollDisbursement.payrollID,
    employeeID: payrollDisbursement.employeeID,
    transactionID: payrollDisbursement.transactionID,
    allocationAmount: payrollDisbursement.allocationAmount,
    creditAmount: payrollDisbursement.creditAmount,
  };
};

export const convertToDomainEnrichedDisbursements = (
  enrichedDisbursement: PrismaPayrollDisbursementModel & {
    transaction?: PrismaTransactionModel;
    employee?: PrismaEmployeeModel & {
      consumer?: Consumer;
    };
  },
): EnrichedDisbursement => {
  console.log(enrichedDisbursement);

  return {
    id: enrichedDisbursement.id,
    debitAmount: enrichedDisbursement.allocationAmount,
    creditAmount: enrichedDisbursement.creditAmount,
    status: enrichedDisbursement.transaction?.status as TransactionStatus,
    firstName: enrichedDisbursement.employee.consumer.firstName,
    lastName: enrichedDisbursement.employee.consumer.lastName,
    lastUpdated: enrichedDisbursement.transaction?.updatedTimestamp,
  };
};
