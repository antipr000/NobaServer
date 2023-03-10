import Joi from "joi";
import { PayrollDisbursement as PrismaPayrollDisbursementModel } from "@prisma/client";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class PayrollDisbursement {
  id: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
  payrollID: string;
  employeeID: string;
  transactionID?: string;
  allocationAmount: number;
}

export class PayrollDisbursementCreateRequest {
  payrollID: string;
  employeeID: string;
  allocationAmount: number;
}

export class PayrollDisbursementUpdateRequest {
  transactionID?: string;
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
  };
};
