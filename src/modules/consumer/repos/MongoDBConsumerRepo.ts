import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Utils } from "../../../core/utils/Utils";
import { Logger } from "winston";
import { KmsKeyType } from "../../../config/configtypes/KmsConfigs";
import { Result } from "../../../core/logic/Result";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { KmsService } from "../../../modules/common/kms.service";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { ConsumerMapper } from "../mappers/ConsumerMapper";
import { IConsumerRepo } from "./ConsumerRepo";

//TODO figure out a way to create indices using joi schema and joigoose
@Injectable()
export class MongoDBConsumerRepo implements IConsumerRepo {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly consumerMapper = new ConsumerMapper();

  constructor(private readonly dbProvider: DBProvider, private readonly kmsService: KmsService) {}

  private async encryptString(text: string): Promise<string> {
    return this.kmsService.encryptString(text, KmsKeyType.SSN);
  }

  async getConsumer(consumerID: string): Promise<Consumer> {
    const userModel = await this.dbProvider.getUserModel();
    const result: any = await userModel.findById(consumerID).exec();

    if (!result) {
      throw new NotFoundException(`Consumer with id ${consumerID} not found`);
    }

    const consumerData: ConsumerProps = convertDBResponseToJsObject(result);
    return this.consumerMapper.toDomain(consumerData);
  }

  async updateConsumer(consumer: Consumer): Promise<Consumer> {
    const userModel = await this.dbProvider.getUserModel();

    // Encrypt SSN
    consumer.props.socialSecurityNumber = await this.encryptString(consumer.props.socialSecurityNumber);

    const result = await userModel
      .findByIdAndUpdate(
        consumer.props._id,
        {
          $set: consumer.props,
        },
        {
          new: true,
        },
      )
      .exec();

    const consumerProps: ConsumerProps = convertDBResponseToJsObject(result);
    return this.consumerMapper.toDomain(consumerProps);
  }

  async getConsumerByEmail(email: string): Promise<Result<Consumer>> {
    if (email === undefined || email === null) {
      throw Error("Email parameter not provided");
    }

    const userModel = await this.dbProvider.getUserModel();
    const result = await userModel.findOne({ email: email }).exec();
    if (result) {
      const consumerProps: ConsumerProps = convertDBResponseToJsObject(result);
      return Result.ok(this.consumerMapper.toDomain(consumerProps));
    } else {
      return Result.fail("Couldn't find consumer in the db");
    }
  }

  async getConsumerByPhone(phone: string): Promise<Result<Consumer>> {
    if (phone === undefined || phone === null) {
      throw Error("Phone parameter not provided");
    }

    const userModel = await this.dbProvider.getUserModel();
    const result = await userModel.findOne({ phone: Utils.stripSpaces(phone) }).exec();
    if (result) {
      const consumer: ConsumerProps = convertDBResponseToJsObject(result);
      return Result.ok(this.consumerMapper.toDomain(consumer));
    } else {
      return Result.fail("Couldn't find consumer in the db");
    }
  }

  async exists(emailOrPhone: string): Promise<boolean> {
    if (Utils.isEmail(emailOrPhone)) {
      return (await this.getConsumerByEmail(emailOrPhone.toLowerCase())).isSuccess;
    } else {
      return (await this.getConsumerByPhone(emailOrPhone)).isSuccess;
    }
  }

  async createConsumer(consumer: Consumer): Promise<Consumer> {
    if (consumer.props.phone !== undefined && consumer.props.phone !== null) {
      // Normalize phone number by removing all spaces
      consumer.props.phone = Utils.stripSpaces(consumer.props.phone);

      // Ensure consumer doesn't already exist with either the phone number or email
      if (await this.exists(consumer.props.phone)) {
        throw Error("Consumer with given phone number already exists");
      }
    }

    if (
      consumer.props.email !== undefined &&
      consumer.props.email !== null &&
      (await this.exists(consumer.props.email))
    ) {
      throw Error("Consumer with given email address already exists");
    } else {
      // Encrypt SSN
      consumer.props.socialSecurityNumber = await this.encryptString(consumer.props.socialSecurityNumber);

      const userModel = await this.dbProvider.getUserModel();
      const result = await userModel.create(consumer.props);

      const consumerProps: ConsumerProps = convertDBResponseToJsObject(result);
      return this.consumerMapper.toDomain(consumerProps);
    }
  }

  async getAllConsumersForPartner(partnerID: string): Promise<Consumer[]> {
    const userModel = await this.dbProvider.getUserModel();
    const result: any = await userModel
      .find({
        "partners.partnerID": partnerID,
      })
      .exec();
    const consumers: Consumer[] = result.map(obj => this.consumerMapper.toDomain(convertDBResponseToJsObject(obj)));
    return consumers;
  }
}
