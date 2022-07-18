import { Result } from "../../../core/logic/Result";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { ConsumerMapper } from "../mappers/ConsumerMapper";
import { IConsumerRepo } from "./ConsumerRepo";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { Injectable, NotFoundException } from "@nestjs/common";
import { KmsService } from "../../../modules/common/kms.service";

//TODO figure out a way to create indices using joi schema and joigoose
@Injectable()
export class MongoDBConsumerRepo implements IConsumerRepo {
  private readonly consumerMapper = new ConsumerMapper();

  constructor(private readonly dbProvider: DBProvider, private readonly kmsService: KmsService) { }

  private async encryptString(text: string): Promise<string> {
    return this.kmsService.encryptString(text);
  }

  private async decryptString(text: string): Promise<string> {
    return this.kmsService.decryptString(text);
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
    consumerProps.socialSecurityNumber = await this.decryptString(consumerProps.socialSecurityNumber);
    return this.consumerMapper.toDomain(consumerProps);
  }

  async getConsumerIfExists(email: string): Promise<Result<Consumer>> {
    try {
      const userModel = await this.dbProvider.getUserModel();
      const result = await userModel.findOne({ email: email }).exec();
      if (result) {
        const consumerProps: ConsumerProps = convertDBResponseToJsObject(result);
        consumerProps.socialSecurityNumber = await this.decryptString(consumerProps.socialSecurityNumber);

        return Result.ok(this.consumerMapper.toDomain(consumerProps));
      } else {
        return Result.fail("Couldn't find consumer in the db");
      }
    } catch (err) {
      return Result.fail("Couldn't find consumer in the db");
    }
  }

  async getConsumerByEmail(email: string): Promise<Result<Consumer>> {
    return this.getConsumerIfExists(email);
  }

  async getConsumerByPhone(phone: string): Promise<Result<Consumer>> {
    try {
      const userModel = await this.dbProvider.getUserModel();
      const result = await userModel.findOne({ phone: phone }).exec();
      if (result) {
        const consumer: ConsumerProps = convertDBResponseToJsObject(result);
        return Result.ok(this.consumerMapper.toDomain(consumer));
      } else {
        return Result.fail("Couldn't find consumer in the db");
      }
    } catch (err) {
      return Result.fail("Couldn't find consumer in the db");
    }
  }

  async exists(email: string): Promise<boolean> {
    const res = await this.getConsumerIfExists(email);
    return res.isSuccess;
  }

  async createConsumer(consumer: Consumer): Promise<Consumer> {
    if (await this.exists(consumer.props.email)) {
      throw Error("Consumer with given email already exists");
    } else {
      // Encrypt SSN
      consumer.props.socialSecurityNumber = await this.encryptString(consumer.props.socialSecurityNumber);

      const userModel = await this.dbProvider.getUserModel();
      const result = await userModel.create(consumer.props);

      const consumerProps: ConsumerProps = convertDBResponseToJsObject(result);
      return this.consumerMapper.toDomain(consumerProps);
    }
  }
}
