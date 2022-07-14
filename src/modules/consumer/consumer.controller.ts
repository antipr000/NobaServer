import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Request,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { ConsumerDTO } from "./dto/ConsumerDTO";
import { ConsumerService } from "./consumer.service";
import { Consumer } from "./domain/Consumer";
import { ConsumerMapper } from "./mappers/ConsumerMapper";
import { UpdateConsumerRequestDTO } from "./dto/UpdateConsumerRequestDTO";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("consumers")
@ApiTags("Consumer")
export class ConsumerController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly consumerMapper: ConsumerMapper;

  constructor(private readonly consumerService: ConsumerService) {
    this.consumerMapper = new ConsumerMapper();
  }

  @Get("/")
  @ApiOperation({ summary: "Gets details of logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Details of logged-in consumer",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getConsumer(@Request() request): Promise<ConsumerDTO> {
    const consumer = request.user;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException();
    }
    // TODO: Add check in login logic to not allow login of consumer who are not part of a partner
    const consumerID: string = consumer.props._id;
    const resp = await this.consumerService.getConsumer(consumerID);
    return this.consumerMapper.toDTO(resp);
  }

  @Patch("/")
  @ApiOperation({ summary: "Updates details of logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Updated consumer record",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async updateConsumer(@Request() request, @Body() requestBody: UpdateConsumerRequestDTO): Promise<ConsumerDTO> {
    const consumer = request.user;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException();
    }

    const consumerProps = {
      ...consumer.props,
      ...requestBody,
    };
    const res = await this.consumerService.updateConsumer(consumerProps);
    return this.consumerMapper.toDTO(res);
  }

  @Post("/paymentmethods")
  @ApiOperation({ summary: "Adds a payment method for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: ConsumerDTO,
    description: "Updated consumer record",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid payment method details" })
  async addPaymentMethod(@Body() requestBody: AddPaymentMethodDTO, @Request() request): Promise<ConsumerDTO> {
    const consumer = request.user;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException();
    }

    const res = await this.consumerService.addCheckoutPaymentMethod(consumer, requestBody);
    return this.consumerMapper.toDTO(res);
  }

  @Delete("/paymentmethods/:paymentToken")
  @ApiOperation({ summary: "Deletes a payment method for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Deleted consumer record",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid payment method details" })
  async deletePaymentMethod(@Param("paymentToken") paymentToken: string, @Request() request): Promise<ConsumerDTO> {
    const consumer = request.user;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException();
    }

    const res = await this.consumerService.removePaymentMethod(consumer, paymentToken);
    return this.consumerMapper.toDTO(res);
  }

  /* Example of how we can decrypt the SSN. This should only be available to the compliance team.
  @Get("/ssn")
  @ApiOperation({ summary: "Gets SSN of currently logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Get SSN of currently logged-in consumer",
  })
  async getConsumerSSN(@Request() request): Promise<string> {
    const consumerID: string = request.consumer.props._id;
    const consumer = await this.consumerService.getConsumer(consumerID);
    const decrypted = await new KMSUtil("ssn-encryption-key").decryptString(consumer.props.socialSecurityNumber);
    return decrypted;
  }*/
}
