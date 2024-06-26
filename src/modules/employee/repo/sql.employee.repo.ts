import { Inject, Injectable } from "@nestjs/common";
import { Employee as EmployeePrismaModel, Employer as EmployerPrismaModel, Prisma } from "@prisma/client";
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
  EmployeeStatus,
  EmployeeUpdateRequest,
  validateCreateEmployeeRequest,
  validateEmployee,
  validateUpdateEmployeeRequest,
} from "../domain/Employee";
import { IEmployeeRepo } from "./employee.repo";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { RepoErrorCode, RepoException } from "../../../core/exception/repo.exception";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { createPaginator } from "../../../infra/sql/paginate/PaginationPipeline";
import { EmployeeFilterOptionsDTO } from "../dto/employee.filter.options.dto";
import { AlertService } from "../../../modules/common/alerts/alert.service";

type EmployeeModelType = EmployeePrismaModel & {
  employer?: EmployerPrismaModel;
};

@Injectable()
export class SqlEmployeeRepo implements IEmployeeRepo {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly alertService: AlertService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createEmployee(request: EmployeeCreateRequest): Promise<Employee> {
    validateCreateEmployeeRequest(request);

    let savedEmployee: Employee = null;

    try {
      // Note that "createdTimestamp", "updatedTimestamp" & "ID" are not included in the input.
      // They are automatically generated by the database.
      const employeeInput: Prisma.EmployeeCreateInput = {
        employer: {
          connect: {
            id: request.employerID,
          },
        },
        ...(request.consumerID && {
          consumer: {
            connect: {
              id: request.consumerID,
            },
          },
        }),
        allocationAmount: request.allocationAmount,
        allocationCurrency: request.allocationCurrency,
        ...(request.salary && { salary: request.salary }),
        ...(request.email && { email: request.email }),
        ...(request.status && { status: request.status }),
      };

      const returnedEmployee: EmployeeModelType = await this.prismaService.employee.create({
        data: employeeInput,
      });
      savedEmployee = convertToDomainEmployee(returnedEmployee);
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
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
          message: "Consumer is already registered with the specified Employer",
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
      this.alertService.raiseError(JSON.stringify(err));
      throw new InvalidDatabaseRecordException({
        message: "Error validating Employee record that was saved to the database",
      });
    }
  }

  async updateEmployee(id: string, request: EmployeeUpdateRequest): Promise<Employee> {
    validateUpdateEmployeeRequest(request);

    try {
      const employeeUpdateInput: Prisma.EmployeeUpdateInput = {
        ...(request.consumerID && {
          consumer: {
            connect: {
              id: request.consumerID,
            },
          },
        }),
        ...(request.allocationAmount >= 0 && { allocationAmount: request.allocationAmount }),
        ...(request.allocationCurrency && { allocationCurrency: request.allocationCurrency }),
        ...(request.salary >= 0 && { salary: request.salary }),
        ...(request.email && { email: request.email }),
        ...(request.status && { status: request.status }),
        ...(request.lastInviteSentTimestamp && { lastInviteSentTimestamp: request.lastInviteSentTimestamp }),
      };

      const returnedEmployee: EmployeeModelType = await this.prismaService.employee.update({
        where: {
          id: id,
          // We are explicitly allowing UNLINKED employees to be returned here as we are looking for
          // a specific employee record and not a list of employees.
        },
        data: employeeUpdateInput,
      });
      return convertToDomainEmployee(returnedEmployee);
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
      if (err.meta && err.meta.cause === "Record to update not found.") {
        throw new NotFoundError({});
      }
      throw new DatabaseInternalErrorException({
        message: `Error updating the Employee with ID: '${id}'`,
      });
    }
  }

  async getEmployeeByID(id: string, fetchEmployerDetails?: boolean): Promise<Employee> {
    try {
      const employee: EmployeeModelType = await this.prismaService.employee.findUnique({
        where: {
          id: id,
          // We are explicitly allowing UNLINKED employees to be returned here as we are looking for
          // a specific employee record and not a list of employees.
        },
        include: {
          employer: fetchEmployerDetails ?? false,
        },
      });

      if (!employee) {
        return null;
      }

      return convertToDomainEmployee(employee);
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the Employee with ID: '${id}'`,
      });
    }
  }

  async getEmployeeByConsumerAndEmployerID(
    consumerID: string,
    employerID: string,
    fetchEmployerDetails?: boolean,
  ): Promise<Employee> {
    try {
      const employee: EmployeeModelType = await this.prismaService.employee.findUnique({
        where: {
          consumerID_employerID: {
            consumerID: consumerID,
            employerID: employerID,
          },
          // We are explicitly allowing UNLINKED employees to be returned here as we are looking for
          // a specific employee record and not a list of employees.
        },
        include: {
          employer: fetchEmployerDetails ?? false,
        },
      });

      if (!employee) {
        return null;
      }

      return convertToDomainEmployee(employee);
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the Employee with consumer ID: '${consumerID}' and employer ID: '${employerID}'`,
      });
    }
  }

  async getEmployeesForConsumerID(consumerID: string, fetchEmployerDetails?: boolean): Promise<Employee[]> {
    try {
      const employees: EmployeeModelType[] = await this.prismaService.employee.findMany({
        where: {
          consumerID: consumerID,
          NOT: { status: EmployeeStatus.UNLINKED },
        },
        include: {
          employer: fetchEmployerDetails ?? false,
        },
      });

      if (!employees || employees.length === 0) {
        return [];
      }

      return employees.map(convertToDomainEmployee);
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving employees with consumerID: '${consumerID}'`,
      });
    }
  }

  async getFilteredEmployees(filterOptions: EmployeeFilterOptionsDTO): Promise<PaginatedResult<Employee>> {
    const paginator = createPaginator<Employee>(
      filterOptions.pageOffset,
      filterOptions.pageLimit,
      convertToDomainEmployee,
    );

    const filterQuery: Prisma.EmployeeFindManyArgs = {
      where: {
        ...(filterOptions.employerID && { employerID: filterOptions.employerID }),
        // email field is always in lowercase, so forcing the search term to lowercase is the cheapest way of doing a case-insensitive search
        ...(filterOptions.employeeEmail && { email: filterOptions.employeeEmail.toLowerCase() }),
        ...(filterOptions.status && { status: filterOptions.status }),
        consumer: {
          ...(filterOptions.firstNameContains && {
            firstName: {
              contains: filterOptions.firstNameContains,
              mode: "insensitive",
            },
          }),
          ...(filterOptions.lastNameContains && {
            lastName: {
              contains: filterOptions.lastNameContains,
              mode: "insensitive",
            },
          }),
        },
      },
      orderBy: {
        ...(filterOptions.createdTimestamp && {
          createdTimestamp: filterOptions.createdTimestamp,
        }),
        ...(filterOptions.sortStatus && {
          status: filterOptions.sortStatus,
        }),
      },
      include: {
        employer: true,
        consumer: {
          include: {
            verificationData: true,
          },
        },
      },
    };

    try {
      return await paginator(this.prismaService.employee, filterQuery);
    } catch (err) {
      this.alertService.raiseError(`Error retrieving employees with filter options: ${JSON.stringify(filterOptions)}`);
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: "Error retrieving employees with given filters",
      });
    }
  }

  async getEmployeesForEmployer(employerID: string, fetchEmployerDetails?: boolean): Promise<Employee[]> {
    try {
      const employees: EmployeeModelType[] = await this.prismaService.employee.findMany({
        where: {
          employerID: employerID,
          NOT: { status: EmployeeStatus.UNLINKED },
        },
        include: {
          employer: fetchEmployerDetails ?? false,
        },
      });

      if (!employees || employees.length === 0) {
        return [];
      }

      return employees.map(convertToDomainEmployee);
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error retrieving employees for employer with ID: '${employerID}'`,
      });
    }
  }

  async getEmployeesForEmployerWithConsumer(employerID: string, fetchEmployerDetails?: boolean): Promise<Employee[]> {
    try {
      const employees: EmployeeModelType[] = await this.prismaService.employee.findMany({
        where: {
          employerID: employerID,
          NOT: { status: EmployeeStatus.UNLINKED },
        },
        include: {
          employer: fetchEmployerDetails ?? false,
          consumer: {
            include: {
              verificationData: true,
            },
          },
        },
      });

      if (!employees || employees.length === 0) {
        return [];
      }

      return employees.map(convertToDomainEmployee);
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error retrieving employees for employer with ID: '${employerID}'`,
      });
    }
  }

  async getActiveEmployeeByEmail(emailID: string): Promise<Employee> {
    try {
      const employee: EmployeeModelType = await this.prismaService.employee.findFirst({
        where: {
          email: emailID,
          NOT: { status: EmployeeStatus.UNLINKED },
        },
      });

      if (!employee) {
        return null;
      }

      return convertToDomainEmployee(employee);
    } catch (e) {
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error retrieving employees with email: '${emailID}'`,
      });
    }
  }
}
