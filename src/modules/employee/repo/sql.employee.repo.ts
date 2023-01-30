import { Inject, Injectable } from "@nestjs/common";
import { Employee as EmployeePrismaModel, Prisma } from "@prisma/client";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import {
  DatabaseInternalErrorException,
  InvalidDatabaseRecordException,
  NotFoundError,
} from "../../../core/exception/CommonAppException";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { Logger } from "winston";
import {
  convertToDomainEmployee,
  Employee,
  EmployeeCreateRequest,
  EmployeeUpdateRequest,
  validateCreateEmployeeRequest,
  validateEmployee,
  validateUpdateEmployeeRequest,
} from "../domain/Employee";
import { IEmployeeRepo } from "./employee.repo";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";

@Injectable()
export class SqlEmployeeRepo implements IEmployeeRepo {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createEmployee(request: EmployeeCreateRequest): Promise<Employee> {
    validateCreateEmployeeRequest(request);

    let savedEmployee: Employee = null;

    try {
      // Note that "createdTimestamp", "updatedTimestamp" & "ID" are not included in the input.
      // They are automatically generated by the database.
      const employeeInput: Prisma.EmployeeCreateInput = {
        consumer: {
          connect: {
            id: request.consumerID,
          },
        },
        employer: {
          connect: {
            id: request.employerID,
          },
        },
        allocationAmount: request.allocationAmount,
        allocationCurrency: request.allocationCurrency,
      };

      const returnedEmployee: EmployeePrismaModel = await this.prismaService.employee.create({
        data: employeeInput,
      });
      savedEmployee = convertToDomainEmployee(returnedEmployee);
    } catch (err) {
      this.logger.error(JSON.stringify(err));

      if (
        err.meta &&
        err.meta.target &&
        err.meta.target.length === 2 &&
        // The oder here is the same as defined in "schema.prisma"
        err.meta.target[0] === "consumerID" &&
        err.meta.target[1] === "employerID"
      ) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.ALREADY_EXISTS,
          message: `Consumer is already registered with the specified Employer`,
        });
      }

      throw new DatabaseInternalErrorException({
        message: "Error saving Employee in database",
      });
    }

    try {
      validateEmployee(savedEmployee);
      return savedEmployee;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new InvalidDatabaseRecordException({
        message: "Error saving Employee in database",
      });
    }
  }

  async updateEmployee(id: string, request: EmployeeUpdateRequest): Promise<Employee> {
    validateUpdateEmployeeRequest(request);

    try {
      const employeeUpdateInput: Prisma.EmployeeUpdateInput = {
        ...(request.allocationAmount && { allocationAmount: request.allocationAmount }),
        ...(request.allocationCurrency && { allocationCurrency: request.allocationCurrency }),
      };

      const returnedEmployee: EmployeePrismaModel = await this.prismaService.employee.update({
        where: {
          id: id,
        },
        data: employeeUpdateInput,
      });
      return convertToDomainEmployee(returnedEmployee);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      if (err.meta && err.meta.cause === "Record to update not found.") {
        throw new NotFoundError({});
      }
      throw new DatabaseInternalErrorException({
        message: `Error updating the Employee with ID: '${id}'`,
      });
    }
  }

  async getEmployeeByID(id: string): Promise<Employee> {
    try {
      const employee: EmployeePrismaModel = await this.prismaService.employee.findUnique({
        where: {
          id: id,
        },
      });

      if (!employee) {
        return null;
      }

      return convertToDomainEmployee(employee);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the Employee with ID: '${id}'`,
      });
    }
  }

  async getEmployeeByConsumerAndEmployerID(consumerID: string, employerID: string): Promise<Employee> {
    try {
      const employee: EmployeePrismaModel = await this.prismaService.employee.findUnique({
        where: {
          consumerID_employerID: {
            consumerID: consumerID,
            employerID: employerID,
          },
        },
      });

      if (!employee) {
        return null;
      }

      return convertToDomainEmployee(employee);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the Employee with consumer ID: '${consumerID}' and employer ID: '${employerID}'`,
      });
    }
  }

  async getEmployeesForConsumerID(consumerID: string): Promise<Employee[]> {
    try {
      const employees: EmployeePrismaModel[] = await this.prismaService.employee.findMany({
        where: {
          consumerID: consumerID,
        },
      });

      if (!employees) {
        return [];
      }

      return employees.map(convertToDomainEmployee);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the Mono transactions for consumer with ID: '${consumerID}'`,
      });
    }
  }
}
