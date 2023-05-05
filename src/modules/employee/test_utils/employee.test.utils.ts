import { createTestConsumer, getRandomActiveConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { createTestEmployerAndStoreInDB } from "../../../modules/employer/test_utils/test.utils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import {
  Employee,
  EmployeeAllocationCurrency,
  EmployeeCreateRequest,
  convertToDomainEmployee,
  EmployeeStatus,
} from "../domain/Employee";
import { uuid } from "uuidv4";

export const saveAndGetEmployee = async (prismaService: PrismaService): Promise<Employee> => {
  const consumerID: string = await createTestConsumer(prismaService);
  const employerID: string = await createTestEmployerAndStoreInDB(prismaService);
  const employeeCreateInput: EmployeeCreateRequest = {
    allocationAmount: 10,
    allocationCurrency: EmployeeAllocationCurrency.COP,
    employerID: employerID,
    consumerID: consumerID,
  };

  const employee = await prismaService.employee.create({
    data: { ...employeeCreateInput, status: EmployeeStatus.CREATED },
  });

  return convertToDomainEmployee(employee);
};

export const getRandomEmployee = (employerID: string, consumerID?: string): Employee => {
  const consumer = getRandomActiveConsumer("57", "CO");
  return {
    id: uuid(),
    allocationAmount: 10,
    allocationCurrency: EmployeeAllocationCurrency.COP,
    employerID: employerID,
    consumerID: consumerID || consumer.props.id,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    status: EmployeeStatus.LINKED,
    consumer: consumer,
  };
};

export const createEmployee = async (
  prismaService: PrismaService,
  employeeCreate: EmployeeCreateRequest,
): Promise<string> => {
  const employee = await prismaService.employee.create({
    data: { ...employeeCreate, status: EmployeeStatus.CREATED },
  });

  return employee.id;
};
