import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { BubbleConfigs } from "../../config/configtypes/BubbleConfigs";
import { BUBBLE_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { NewEmployeeRegisterRequest } from "./dto/bubble.client.dto";
import axios from "axios";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";

@Injectable()
export class BubbleClient {
  private bearerToken: string;
  private baseUrl: string;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const bubbleConfigs: BubbleConfigs = configService.get<BubbleConfigs>(BUBBLE_CONFIG_KEY);
    this.bearerToken = bubbleConfigs.bearerToken;
    this.baseUrl = bubbleConfigs.baseURL;
  }

  private getAuthorizationHeader(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.bearerToken}`,
    };
  }

  async registerNewEmployee(request: NewEmployeeRegisterRequest): Promise<void> {
    this.logger.info(`Registering new employee: ${JSON.stringify(request)} to Bubble`);

    const url = `${this.baseUrl}/employees`;
    const headers = {
      ...this.getAuthorizationHeader(),
    };
    const requestBody = {
      first_name: request.firstName,
      last_name: request.lastName,
      email: request.email,
      phone: request.phone,
      employer_id: request.employerID,
      allocation_amount_in_pesos: request.allocationAmountInPesos,
      noba_employee_id: request.nobaEmployeeID,
    };

    try {
      await axios.post(url, requestBody, { headers });
      this.logger.info(`Successfully registered new employee: ${JSON.stringify(request)} to Bubble`);
    } catch (err) {
      this.logger.error(`Failed to register new employee: ${JSON.stringify(request)} to Bubble. Error: ${err}`);
      throw new ServiceException({
        message: "Error while creating Mono collection link",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }
  }

  async updateEmployeeAllocationAmount(nobaEmployeeID: string, allocationAmountInPesos: number): Promise<void> {
    this.logger.info(`Updating employee allocation amount: ${nobaEmployeeID} to Bubble`);

    const url = `${this.baseUrl}/employees/${nobaEmployeeID}`;
    const headers = {
      ...this.getAuthorizationHeader(),
    };
    const requestBody = {
      allocation_amount_in_pesos: allocationAmountInPesos,
    };

    try {
      await axios.patch(url, requestBody, { headers });
      this.logger.info(`Successfully updated employee allocation amount: ${nobaEmployeeID} to Bubble`);
    } catch (err) {
      this.logger.error(`Failed to update employee allocation amount: ${nobaEmployeeID} to Bubble. Error: ${err}`);
      throw new ServiceException({
        message: "Error while creating Mono collection link",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }
  }
}
