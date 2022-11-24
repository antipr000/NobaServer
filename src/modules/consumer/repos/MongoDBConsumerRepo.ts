import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
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

  async isHandleTaken(handle: string): Promise<boolean> {
    const userModel = await this.dbProvider.getUserModel();
    const user = await userModel.findOne({ handle: handle });

    if (user) return true;
    return false;
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

    try {
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
    } catch (err) {
      this.logger.error(JSON.stringify(err));

      if (err.code === 11000 && err.keyPattern && err.keyPattern.handle === 1) {
        throw new BadRequestException("A user with same 'handle' already exist");
      }
      throw err;
    }
  }

  async getConsumerIfExists(email: string): Promise<Result<Consumer>> {
    const userModel = await this.dbProvider.getUserModel();
    const result = await userModel.findOne({ email: email }).exec();
    if (result) {
      const consumerProps: ConsumerProps = convertDBResponseToJsObject(result);
      return Result.ok(this.consumerMapper.toDomain(consumerProps));
    } else {
      return Result.fail("Couldn't find consumer in the db");
    }
  }

  async getConsumerByEmail(email: string): Promise<Result<Consumer>> {
    return this.getConsumerIfExists(email);
  }

  async getConsumerByPhone(phone: string): Promise<Result<Consumer>> {
    const userModel = await this.dbProvider.getUserModel();
    const result = await userModel.findOne({ phone: phone }).exec();
    if (result) {
      const consumer: ConsumerProps = convertDBResponseToJsObject(result);
      return Result.ok(this.consumerMapper.toDomain(consumer));
    } else {
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
      if (consumer.props.handle === undefined || consumer.props.handle === null) {
        consumer.props.handle = `${consumer.props.email.substring(0, 3)}${Date.now().valueOf().toString().substr(5)}`;
      }

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
