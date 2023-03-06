import { createTestConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { createTestEmployerAndStoreInDB } from "../../../modules/employer/test_utils/test.utils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import {
  Employee,
  EmployeeAllocationCurrency,
  EmployeeCreateRequest,
  convertToDomainEmployee,
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

  const employee = await prismaService.employee.create({ data: employeeCreateInput });

  return convertToDomainEmployee(employee);
};

export const getRandomEmployee = (employerID: string): Employee => {
  return {
    id: uuid(),
    allocationAmount: 10,
    allocationCurrency: EmployeeAllocationCurrency.COP,
    employerID: employerID,
    consumerID: uuid(),
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };
};
