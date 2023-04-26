import {
  Employee as PrismaEmployeeModel,
  Employer as PrismaEmployerModel,
  Consumer as PrismaConsumerModel,
} from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { Employer, convertToDomainEmployer } from "../../../modules/employer/domain/Employer";
import { Consumer } from "../../../modules/consumer/domain/Consumer";

export class Employee {
  id: string;
  allocationAmount: number;
  allocationCurrency: EmployeeAllocationCurrency;
  employerID: string;
  consumerID?: string;
  email?: string;
  salary?: number;
  status: EmployeeStatus;
  createdTimestamp: Date;
  updatedTimestamp: Date;
  lastInviteSentTimestamp?: Date;
  employer?: Employer;
  consumer?: Consumer;
}

// TODO: Merge "all" the currency enums across modules in a single enum &
// wrap it in a service for validation.
export enum EmployeeAllocationCurrency {
  COP = "COP",
}

export enum EmployeeStatus {
  CREATED = "CREATED", // Employee created but no invitation sent
  INVITED = "INVITED", // Employee invited but not linked
  LINKED = "LINKED", // Employee linked to a consumer
  UNLINKED = "UNLINKED", // Employee unlinked from a consumer (essentially deleted)
}

export class EmployeeCreateRequest {
  allocationAmount: number;
  allocationCurrency: EmployeeAllocationCurrency;
  employerID: string;
  consumerID?: string;
  email?: string;
  salary?: number;
  status: EmployeeStatus;
}

export class EmployeeUpdateRequest {
  allocationAmount?: number;
  allocationCurrency?: EmployeeAllocationCurrency;
  salary?: number;
  email?: string;
  consumerID?: string;
  lastInviteSentTimestamp?: Date;
  status?: EmployeeStatus;
}

export const validateCreateEmployeeRequest = (employee: EmployeeCreateRequest) => {
  const employeeJoiValidationKeys: KeysRequired<EmployeeCreateRequest> = {
    allocationAmount: Joi.number().required(),
    allocationCurrency: Joi.string()
      .required()
      .valid(...Object.values(EmployeeAllocationCurrency)),
    consumerID: Joi.string().optional(),
    employerID: Joi.string().required(),
    email: Joi.string().optional(),
    salary: Joi.number().optional(),
    status: Joi.string()
      .optional()
      .valid(...Object.values(EmployeeStatus)),
  };

  const employeeJoiSchema = Joi.object(employeeJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(employee, employeeJoiSchema);
};

export const validateUpdateEmployeeRequest = (employee: EmployeeUpdateRequest) => {
  const employeeJoiValidationKeys: KeysRequired<EmployeeUpdateRequest> = {
    consumerID: Joi.string().optional(),
    allocationAmount: Joi.number().optional(),
    allocationCurrency: Joi.string()
      .optional()
      .valid(...Object.values(EmployeeAllocationCurrency)),
    salary: Joi.number().optional(),
    email: Joi.string().optional(),
    status: Joi.string()
      .optional()
      .valid(...Object.values(EmployeeStatus)),
    lastInviteSentTimestamp: Joi.date().optional(),
  };

  const employeeJoiSchema = Joi.object(employeeJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(employee, employeeJoiSchema);
};

export const validateEmployee = (employee: Employee) => {
  const employeeJoiValidationKeys: KeysRequired<Employee> = {
    id: Joi.string().required(),
    allocationAmount: Joi.number().required(),
    allocationCurrency: Joi.string()
      .required()
      .valid(...Object.values(EmployeeAllocationCurrency)),
    employerID: Joi.string().required(),
    consumerID: Joi.string().optional().allow(null),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
    salary: Joi.number().optional(),
    employer: Joi.object().optional(),
    consumer: Joi.object().optional(),
    email: Joi.string().optional().allow(null),
    status: Joi.string()
      .required()
      .valid(...Object.values(EmployeeStatus)),
    lastInviteSentTimestamp: Joi.date().optional().allow(null),
  };

  const employeeJoiSchema = Joi.object(employeeJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(employee, employeeJoiSchema);
};

export const convertToDomainEmployee = (
  employee: PrismaEmployeeModel & { employer?: PrismaEmployerModel; consumer?: PrismaConsumerModel },
): Employee => {
  return {
    id: employee.id,
    allocationAmount: employee.allocationAmount,
    allocationCurrency: employee.allocationCurrency as EmployeeAllocationCurrency,
    employerID: employee.employerID,
    consumerID: employee.consumerID,
    email: employee.email,
    status: employee.status as EmployeeStatus,
    createdTimestamp: employee.createdTimestamp,
    updatedTimestamp: employee.updatedTimestamp,
    lastInviteSentTimestamp: employee.lastInviteSentTimestamp,
    ...(employee.salary && { salary: employee.salary }),
    ...(employee.employer && { employer: convertToDomainEmployer(employee.employer) }),
    ...(employee.consumer && { consumer: Consumer.createConsumer(employee.consumer) }),
  };
};
