import { Employer as PrismaEmployerModel } from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class Employer {
  id: string;
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  leadDays: number;
  payrollDays: number[];
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export class EmployerCreateRequest {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  leadDays: number;
  payrollDays: number[];
}

export class EmployerUpdateRequest {
  logoURI?: string;
  referralID?: string;
  leadDays?: number;
  payrollDays?: number[];
}

export const validateCreateEmployerRequest = (employer: EmployerCreateRequest) => {
  const employerJoiValidationKeys: KeysRequired<EmployerCreateRequest> = {
    name: Joi.string().required(),
    logoURI: Joi.string().required(),
    referralID: Joi.string().required(),
    bubbleID: Joi.string().required(),
    leadDays: Joi.number().required(),
    payrollDays: Joi.array().items(Joi.number()).required(),
  };

  const employerJoiSchema = Joi.object(employerJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(employer, employerJoiSchema);
};

export const validateUpdateEmployerRequest = (employer: EmployerUpdateRequest) => {
  const employerJoiValidationKeys: KeysRequired<EmployerUpdateRequest> = {
    logoURI: Joi.string().optional(),
    referralID: Joi.string().optional(),
    leadDays: Joi.number().optional(),
    payrollDays: Joi.array().items(Joi.number()).optional(),
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
    logoURI: Joi.string().required(),
    referralID: Joi.string().required(),
    bubbleID: Joi.string().required(),
    leadDays: Joi.number().required(),
    payrollDays: Joi.array().items(Joi.number()).required(),
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
    logoURI: employer.logoURI,
    referralID: employer.referralID,
    bubbleID: employer.bubbleID,
    leadDays: employer.leadDays,
    payrollDays: employer.payrollDays,
    createdTimestamp: employer.createdTimestamp,
    updatedTimestamp: employer.updatedTimestamp,
  };
};
