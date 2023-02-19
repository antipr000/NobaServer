import { Employee as PrismaEmployeeModel } from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class Employee {
  id: string;
  allocationAmount: number;
  allocationCurrency: EmployeeAllocationCurrency;
  employerID: string;
  consumerID: string;
  salary?: number;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

// TODO: Merge "all" the currency enums across modules in a single enum &
// wrap it in a service for validation.
export enum EmployeeAllocationCurrency {
  COP = "COP",
}

export class EmployeeCreateRequest {
  allocationAmount: number;
  allocationCurrency: EmployeeAllocationCurrency;
  employerID: string;
  consumerID: string;
  salary?: number;
}

export class EmployeeUpdateRequest {
  allocationAmount?: number;
  allocationCurrency?: EmployeeAllocationCurrency;
  salary?: number;
}

export const validateCreateEmployeeRequest = (employee: EmployeeCreateRequest) => {
  const employeeJoiValidationKeys: KeysRequired<EmployeeCreateRequest> = {
    allocationAmount: Joi.number().required(),
    allocationCurrency: Joi.string()
      .required()
      .valid(...Object.values(EmployeeAllocationCurrency)),
    consumerID: Joi.string().required(),
    employerID: Joi.string().required(),
    salary: Joi.number().optional(),
  };

  const employeeJoiSchema = Joi.object(employeeJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(employee, employeeJoiSchema);
};

export const validateUpdateEmployeeRequest = (employee: EmployeeUpdateRequest) => {
  const employeeJoiValidationKeys: KeysRequired<EmployeeUpdateRequest> = {
    allocationAmount: Joi.number().optional(),
    allocationCurrency: Joi.string()
      .optional()
      .valid(...Object.values(EmployeeAllocationCurrency)),
    salary: Joi.number().optional(),
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
    consumerID: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
    salary: Joi.number().optional(),
  };

  const employeeJoiSchema = Joi.object(employeeJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(employee, employeeJoiSchema);
};

export const convertToDomainEmployee = (employee: PrismaEmployeeModel): Employee => {
  return {
    id: employee.id,
    allocationAmount: employee.allocationAmount,
    allocationCurrency: employee.allocationCurrency as EmployeeAllocationCurrency,
    employerID: employee.employerID,
    consumerID: employee.consumerID,
    createdTimestamp: employee.createdTimestamp,
    updatedTimestamp: employee.updatedTimestamp,
    ...(employee.salary && { salary: employee.salary }),
  };
};
