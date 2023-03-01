import { createTestConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { createTestEmployerAndStoreInDB } from "../../../modules/employer/test_utils/test.utils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import {
  Employee,
  EmployeeAllocationCurrency,
  EmployeeCreateRequest,
  convertToDomainEmployee,
} from "../domain/Employee";

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
