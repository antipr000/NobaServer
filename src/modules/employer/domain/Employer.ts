import { Employer as PrismaEmployerModel } from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class Employer {
  id: string;
  name: string;
  depositMatchingName?: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  documentNumber?: string;
  leadDays: number;
  maxAllocationPercent?: number;
  payrollDates: string[];
  payrollAccountNumber?: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export type EmployeeDisbursement = {
  employeeName: string;
  amount: number;
  creditAmount: number;
};
export class EmployerCreateRequest {
  name: string;
  depositMatchingName?: string;
  logoURI: string;
  referralID: string;
  documentNumber?: string;
  bubbleID: string;
  leadDays: number;
  maxAllocationPercent?: number;
  payrollAccountNumber?: string;
  payrollDates: string[];
}

export class EmployerUpdateRequest {
  name?: string;
  depositMatchingName?: string;
  logoURI?: string;
  referralID?: string;
  leadDays?: number;
  documentNumber?: string;
  payrollDates?: string[];
  payrollAccountNumber?: string;
  maxAllocationPercent?: number;
}

export const validateCreateEmployerRequest = (employer: EmployerCreateRequest) => {
  const employerJoiValidationKeys: KeysRequired<EmployerCreateRequest> = {
    name: Joi.string().required(),
    depositMatchingName: Joi.string().optional(),
    logoURI: Joi.string().required(),
    referralID: Joi.string().required(),
    documentNumber: Joi.string().optional(),
    bubbleID: Joi.string().required(),
    maxAllocationPercent: Joi.number().optional(),
    leadDays: Joi.number().required(),
    payrollAccountNumber: Joi.string().optional().allow(null),
    // Dates should be in YYYY-MM-DD format
    payrollDates: Joi.array()
      .items(Joi.string().pattern(/^\d{4}-([0]\d|1[0-2])-([0-2]\d|3[01])$/))
      .optional(),
  };

  const employerJoiSchema = Joi.object(employerJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(employer, employerJoiSchema);
};

export const validateUpdateEmployerRequest = (employer: EmployerUpdateRequest) => {
  const employerJoiValidationKeys: KeysRequired<EmployerUpdateRequest> = {
    name: Joi.string().optional(),
    depositMatchingName: Joi.string().optional(),
    logoURI: Joi.string().optional(),
    referralID: Joi.string().optional(),
    documentNumber: Joi.string().optional(),
    leadDays: Joi.number().optional(),
    payrollAccountNumber: Joi.string().optional().allow(null),
    payrollDates: Joi.array()
      .items(Joi.string().pattern(/^\d{4}-([0]\d|1[0-2])-([0-2]\d|3[01])$/))
      .optional(),
    maxAllocationPercent: Joi.number().optional(),
  };

  const employerJoiSchema = Joi.object(employerJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(employer, employerJoiSchema);
};

export const validateEmployer = (employer: Employer) => {
  const employerJoiValidationKeys: KeysRequired<Employer> = {
    id: Joi.string().required(),
    name: Joi.string().required(),
    depositMatchingName: Joi.string().optional().allow(null),
    logoURI: Joi.string().required(),
    referralID: Joi.string().required(),
    bubbleID: Joi.string().required(),
    documentNumber: Joi.string().required().allow(null),
    leadDays: Joi.number().required(),
    maxAllocationPercent: Joi.number().optional(),
    payrollAccountNumber: Joi.string().optional().allow(null),
    payrollDates: Joi.array()
      .items(Joi.string().pattern(/^\d{4}-([0]\d|1[0-2])-([0-2]\d|3[01])$/))
      .optional(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };

  const employerJoiSchema = Joi.object(employerJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(employer, employerJoiSchema);
};

export const convertToDomainEmployer = (employer: PrismaEmployerModel): Employer => {
  return {
    id: employer.id,
    name: employer.name,
    depositMatchingName: employer.depositMatchingName,
    logoURI: employer.logoURI,
    referralID: employer.referralID,
    bubbleID: employer.bubbleID,
    documentNumber: employer.documentNumber,
    ...(employer.maxAllocationPercent && { maxAllocationPercent: employer.maxAllocationPercent }),
    leadDays: employer.leadDays,
    payrollDates: employer.payrollDates,
    payrollAccountNumber: employer.payrollAccountNumber,
    createdTimestamp: employer.createdTimestamp,
    updatedTimestamp: employer.updatedTimestamp,
  };
};
