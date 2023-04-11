import { Inject, Injectable } from "@nestjs/common";
import { Result } from "../../../core/logic/Result";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { IConsumerRepo } from "./consumer.repo";
import { PrismaService } from "../../../infraproviders/PrismaService";
import {
  DocumentVerificationStatus,
  KYCStatus,
  PaymentMethodStatus,
  Prisma,
  WalletStatus,
  Identification as PrismaIdentificationModel,
  ConsumerConfiguration as PrismaConfigurationModel,
} from "@prisma/client";
import { PaymentMethod, PaymentMethodProps } from "../domain/PaymentMethod";
import { ConsumerRepoMapper } from "../mappers/ConsumerRepoMapper";
import { CryptoWallet, CryptoWalletProps } from "../domain/CryptoWallet";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { Utils } from "../../../core/utils/Utils";
import { ContactInfo } from "../domain/ContactInfo";
import { KmsService } from "../../../modules/common/kms.service";
import { KmsKeyType } from "../../../config/configtypes/KmsConfigs";
import { FindConsumerByStructuredFieldsDTO } from "../dto/consumer.search.dto";
import {
  convertToDomainIdentification,
  Identification,
  IdentificationCreateRequest,
  IdentificationUpdateRequest,
  validateCreateIdentificationRequest,
  validateIdentification,
  validateUpdateIdentificationRequest,
} from "../domain/Identification";
import { RepoErrorCode, RepoException } from "../../../core/exception/repo.exception";
import {
  ConsumerConfiguration,
  ConsumerConfigurationCreateRequest,
  ConsumerConfigurationUpdateRequest,
  convertToDomainConsumerConfiguration,
  validateConsumerConfiguration,
  validateCreateConsumerConfigurationRequest,
  validateUpdateConsumerConfigurationRequest,
} from "../domain/ConsumerConfiguration";

@Injectable()
export class SQLConsumerRepo implements IConsumerRepo {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly kmsService: KmsService;

  private readonly mapper: ConsumerRepoMapper;

  constructor() {
    this.mapper = new ConsumerRepoMapper();
  }

  async getConsumer(consumerID: string): Promise<Consumer> {
    try {
      const consumerProps = await this.prisma.consumer.findFirst({
        where: { id: consumerID, isDisabled: false },
        include: { address: true, verificationData: true },
      });
      if (!consumerProps) return null;
      return Consumer.createConsumer(consumerProps);
    } catch (e) {
      return null;
    }
  }

  async adminGetConsumer(consumerID: string): Promise<Consumer> {
    try {
      const consumerProps = await this.prisma.consumer.findFirst({
        where: { id: consumerID },
        include: { address: true, verificationData: true },
      });
      if (!consumerProps) return null;
      return Consumer.createConsumer(consumerProps);
    } catch (e) {
      return null;
    }
  }

  async getConsumerByHandle(handle: string): Promise<Consumer> {
    try {
      const consumerProps = await this.prisma.consumer.findFirst({
        where: { handle: { equals: handle, mode: "insensitive" } },
        include: { address: true, verificationData: true },
      });

      if (!consumerProps) return null;
      return Consumer.createConsumer(consumerProps);
    } catch (e) {
      return null;
    }
  }

  async createConsumer(consumer: Consumer): Promise<Consumer> {
    if (consumer.props.phone) {
      consumer.props.phone = Utils.stripSpaces(consumer.props.phone);
    }

    if (consumer.props.handle && (await this.isHandleTaken(consumer.props.handle))) {
      throw new BadRequestError({ message: "Handle is already taken!" });
    }

    const consumerInput = this.mapper.toCreateConsumerInput(consumer);
    try {
      const consumerProps = await this.prisma.consumer.create({
        data: consumerInput,
        include: { address: true, verificationData: true },
      });
      return Consumer.createConsumer(consumerProps);
    } catch (e) {
      throw new BadRequestError({
        message: e.message,
      });
    }
  }

  async exists(emailOrPhone: string): Promise<boolean> {
    if (Utils.isEmail(emailOrPhone)) {
      return (await this.getConsumerByEmail(emailOrPhone.toLowerCase())).isSuccess;
    } else {
      return (await this.getConsumerByPhone(emailOrPhone)).isSuccess;
    }
  }

  async findConsumersByPublicInfo(publicInfoSearch: string, limit: number): Promise<Result<Consumer[]>> {
    publicInfoSearch = publicInfoSearch.trim();

    const handleOnly = publicInfoSearch.startsWith("$");
    const nameOnly = publicInfoSearch.indexOf(" ") > -1;

    let handle = publicInfoSearch;
    let firstName = publicInfoSearch;
    let lastName = publicInfoSearch;

    if (handleOnly) {
      handle = publicInfoSearch.substring(1).trim();
    }

    if (nameOnly) {
      firstName = publicInfoSearch.split(" ")[0].trim();
      lastName = publicInfoSearch.split(" ")[1].trim();
    }

    // If search term starts with $, sort by handle. Otherwise sort by last name.
    const order: Prisma.ConsumerOrderByWithRelationInput = handleOnly ? { handle: "asc" } : { lastName: "asc" };

    const query: Prisma.ConsumerWhereInput = {
      isLocked: false,
      isDisabled: false,
      verificationData: {
        kycCheckStatus: KYCStatus.APPROVED,
        documentVerificationStatus: {
          in: [DocumentVerificationStatus.APPROVED, DocumentVerificationStatus.NOT_REQUIRED],
        },
      },
    };

    // If a space is provided, it is expected that the firstName and lastName match the terms on either side of the space, so these conditions should not be "OR'd"
    if (nameOnly) {
      query.AND = [
        {
          firstName: {
            contains: firstName,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: lastName,
            mode: "insensitive",
          },
        },
      ];
    } else {
      query.OR = [
        {
          handle: {
            contains: handle,
            mode: "insensitive",
          },
        },
      ];

      if (!handleOnly) {
        query.OR = [
          ...query.OR,
          {
            firstName: {
              contains: firstName,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: lastName,
              mode: "insensitive",
            },
          },
        ];
      }
    }

    try {
      const consumers = await this.prisma.consumer.findMany({
        where: query,
        orderBy: order,
        take: limit,
        include: { verificationData: true },
      });

      return Result.ok(consumers.map(consumer => Consumer.createConsumer(consumer)));
    } catch (e) {
      return Result.fail(`Couldn't find consumer with given contact info for unknown reason: ${e}`);
    }
  }

  async findConsumerByContactInfo(contactInfo: ContactInfo): Promise<Result<Consumer>> {
    try {
      const consumerContact = await this.prisma.consumer.findFirst({
        where: {
          AND: [
            {
              isLocked: false,
            },
            {
              isDisabled: false,
            },
            {
              OR: [
                {
                  email: {
                    in: contactInfo.emails,
                  },
                },
                {
                  phone: {
                    in: contactInfo.phoneNumbers,
                  },
                },
              ],
            },
          ],
        },
      });

      if (!consumerContact) return Result.fail("Couldn't find consumer with given contact info");
      return Result.ok(Consumer.createConsumer(consumerContact));
    } catch (e) {
      return Result.fail(`Couldn't find consumer with given contact info for unknown reason: ${e}`);
    }
  }

  async getConsumerByEmail(email: string): Promise<Result<Consumer>> {
    try {
      const consumerProps = await this.prisma.consumer.findUnique({
        where: { email: email },
        include: { address: true, verificationData: true },
      });
      if (consumerProps) {
        return Result.ok(Consumer.createConsumer(consumerProps));
      } else {
        return Result.fail("Couldn't find consumer with given email in the db");
      }
    } catch (e) {
      return Result.fail(`Couldn't find consumer with given email in the db for unknown reason: ${e}`);
    }
  }

  async getConsumerByPhone(phone: string): Promise<Result<Consumer>> {
    try {
      const consumerProps = await this.prisma.consumer.findUnique({
        where: { phone: Utils.stripSpaces(phone) },
        include: { address: true, verificationData: true },
      });
      if (consumerProps) {
        return Result.ok(Consumer.createConsumer(consumerProps));
      } else {
        return Result.fail("Couldn't find consumer with given phone number in the db");
      }
    } catch (e) {
      return Result.fail(`Couldn't find consumer with given phone number in the db for unknown reason: ${e}`);
    }
  }

  async getConsumerIDByHandle(handle: string): Promise<string> {
    const consumerProps = await this.prisma.consumer.findFirst({
      select: { id: true },
      where: { handle: { equals: handle, mode: "insensitive" } },
    });

    if (!consumerProps) return null;

    return consumerProps.id;
  }

  async getConsumerIDByReferralCode(referralCode: string): Promise<string> {
    const consumerProps = await this.prisma.consumer.findFirst({
      select: { id: true },
      where: { referralCode: { equals: referralCode } }, // Intentionally case-sensitive
    });

    if (!consumerProps) return null;

    return consumerProps.id;
  }

  async adminFindConsumersByStructuredFields(filter: FindConsumerByStructuredFieldsDTO): Promise<Result<Consumer[]>> {
    // Clean up search parameters
    const handle = filter.handle && filter.handle.startsWith("$") ? filter.handle.substring(1).trim() : filter.handle;

    filter.email = filter.email && filter.email.toLowerCase();
    filter.phone = filter.phone && Utils.stripSpaces(filter.phone);

    let firstName;
    let lastName;

    if (filter.name) {
      firstName = filter.name && filter.name.indexOf(" ") > -1 ? filter.name.split(" ")[0].trim() : filter.name.trim();
      lastName = filter.name && filter.name.indexOf(" ") > -1 ? filter.name.split(" ")[1].trim() : filter.name.trim();
    }

    // Build query
    const query: Prisma.ConsumerWhereInput = {};

    query.OR = [];

    if (filter.email) {
      query.OR.push({ email: { contains: filter.email, mode: "insensitive" } });
    }

    if (filter.phone) {
      query.OR.push({ phone: { contains: filter.phone, mode: "insensitive" } });
    }

    if (filter.kycStatus) {
      query.OR.push({
        verificationData: {
          kycCheckStatus: filter.kycStatus,
        },
      });
    }

    if (filter.name) {
      // If a space is provided, it is expected that the firstName and lastName match the terms
      // on either side of the space, so these conditions should be ANDed not ORed
      if (filter.name.indexOf(" ") > -1) {
        query.OR.push({
          firstName: {
            contains: firstName,
            mode: "insensitive",
          },
          lastName: {
            contains: lastName,
            mode: "insensitive",
          },
        });
      } else {
        // If no space, search could be for a last name or first name so we OR them
        query.OR.push({
          firstName: {
            contains: firstName,
            mode: "insensitive",
          },
        });
        query.OR.push({
          lastName: {
            contains: lastName,
            mode: "insensitive",
          },
        });
      }
    }

    if (handle) {
      query.OR = [
        {
          handle: {
            contains: handle,
            mode: "insensitive",
          },
        },
      ];
    }

    try {
      const consumers = await this.prisma.consumer.findMany({
        ...(query.OR.length > 0 && { where: query }), // If no OR conditions, find everything
        orderBy: { lastName: "asc" },
        include: { address: true, verificationData: true },
      });

      return Result.ok(consumers.map(consumer => Consumer.createConsumer(consumer)));
    } catch (e) {
      return Result.fail(`Couldn't find consumer with given contact info for unknown reason: ${e}`);
    }
  }

  async updateConsumer(consumerID: string, consumer: Partial<ConsumerProps>): Promise<Consumer> {
    try {
      if (consumer.socialSecurityNumber) {
        consumer.socialSecurityNumber = await this.kmsService.encryptString(
          consumer.socialSecurityNumber,
          KmsKeyType.SSN,
        );
      }
      const updateConsumerInput = this.mapper.toUpdateConsumerInput(consumer);
      const consumerProps = await this.prisma.consumer.update({
        where: { id: consumerID },
        data: updateConsumerInput,
        include: { address: true, verificationData: true },
      });
      return Consumer.createConsumer(consumerProps);
    } catch (e) {
      throw new BadRequestError({
        message: `Failed to update consumer. Reason: ${e.message}`,
      });
    }
  }

  async isHandleTaken(handle: string): Promise<boolean> {
    return (await this.getConsumerIDByHandle(handle)) != null;
  }

  async addPaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    const paymentMethodInput = this.mapper.toCreatePaymentMethodInput(paymentMethod);
    const paymentMethodProps = await this.prisma.paymentMethod.create({ data: paymentMethodInput });
    return PaymentMethod.createPaymentMethod(paymentMethodProps);
  }

  async getPaymentMethodForConsumer(id: string, consumerID: string): Promise<PaymentMethod> {
    const paymentMethodProps = await this.prisma.paymentMethod.findFirst({
      where: { id: id, consumerID: consumerID, status: { not: PaymentMethodStatus.DELETED } },
    });
    if (!paymentMethodProps) return null;
    return PaymentMethod.createPaymentMethod(paymentMethodProps);
  }

  async getAllPaymentMethodsForConsumer(consumerID: string): Promise<PaymentMethod[]> {
    const allPaymentMethods = await this.prisma.paymentMethod.findMany({
      where: { consumerID: consumerID, status: { not: PaymentMethodStatus.DELETED } },
    });
    if (!allPaymentMethods) return [];
    return allPaymentMethods.map(paymentMethod => PaymentMethod.createPaymentMethod(paymentMethod));
  }

  async updatePaymentMethod(id: string, paymentMethodProps: Partial<PaymentMethodProps>): Promise<PaymentMethod> {
    const updatePaymentMethodInput = this.mapper.toUpdatePaymentMethodInput(paymentMethodProps);
    const updatedProps = await this.prisma.paymentMethod.update({ where: { id: id }, data: updatePaymentMethodInput });
    return PaymentMethod.createPaymentMethod(updatedProps);
  }

  async addCryptoWallet(cryptoWallet: CryptoWallet): Promise<CryptoWallet> {
    try {
      const cryptoWalletCreateInput = this.mapper.toCreateWalletInput(cryptoWallet);
      const walletProps = await this.prisma.cryptoWallet.create({ data: cryptoWalletCreateInput });
      return CryptoWallet.createCryptoWallet(walletProps);
    } catch (e) {
      throw new BadRequestError({ message: `Failed to add crypto wallet. Reason: ${e.message}` });
    }
  }

  async getCryptoWalletForConsumer(id: string, consumerID: string): Promise<CryptoWallet> {
    const walletProps = await this.prisma.cryptoWallet.findFirst({
      where: { id: id, consumerID: consumerID, status: { not: WalletStatus.DELETED } },
    });
    if (!walletProps) return null;
    return CryptoWallet.createCryptoWallet(walletProps);
  }

  async getAllCryptoWalletsForConsumer(consumerID: string): Promise<CryptoWallet[]> {
    const allWallets = await this.prisma.cryptoWallet.findMany({
      where: { consumerID: consumerID, status: { not: WalletStatus.DELETED } },
    });
    return allWallets.map(wallet => CryptoWallet.createCryptoWallet(wallet));
  }

  async updateCryptoWallet(id: string, cryptoWalletProps: Partial<CryptoWalletProps>): Promise<CryptoWallet> {
    try {
      const walletUpdateInput = this.mapper.toUpdateWalletInput(cryptoWalletProps);
      const updatedWalletProps = await this.prisma.cryptoWallet.update({ where: { id: id }, data: walletUpdateInput });
      return CryptoWallet.createCryptoWallet(updatedWalletProps);
    } catch (e) {
      throw new BadRequestError({ message: `Failed to update crypto wallet. Reason: ${e.message}` });
    }
  }

  async addIdentification(identification: IdentificationCreateRequest): Promise<Identification> {
    validateCreateIdentificationRequest(identification);
    let savedIdentification: Identification = null;

    try {
      const identificationInput: Prisma.IdentificationCreateInput = {
        consumer: {
          connect: {
            id: identification.consumerID,
          },
        },
        type: identification.type,
        value: identification.value,
        countryCode: identification.countryCode,
      };

      const returnedIdentification: PrismaIdentificationModel = await this.prisma.identification.create({
        data: identificationInput,
      });
      savedIdentification = convertToDomainIdentification(returnedIdentification);
    } catch (err) {
      if (err.code === "P2025") {
        throw new RepoException({
          errorCode: RepoErrorCode.NOT_FOUND,
          message: `Failed to store Identification in database because consumer with id ${identification.consumerID} was not found`,
        });
      }
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: "Error saving Identification in database",
      });
    }

    try {
      validateIdentification(savedIdentification);
      return savedIdentification;
    } catch (err) {
      throw new RepoException({
        errorCode: RepoErrorCode.INVALID_DATABASE_RECORD,
        message: "Error saving Identification in database",
      });
    }
  }

  async updateIdentification(id: string, identification: IdentificationUpdateRequest): Promise<Identification> {
    validateUpdateIdentificationRequest(identification);

    try {
      const identificationUpdateInput: Prisma.IdentificationUpdateInput = {
        ...(identification.value && { value: identification.value }),
      };

      const returnedIdentification: PrismaIdentificationModel = await this.prisma.identification.update({
        data: identificationUpdateInput,
        where: {
          id: id,
        },
      });

      return convertToDomainIdentification(returnedIdentification);
    } catch (err) {
      if (err.meta && err.meta.cause === "Record to update not found.") {
        throw new RepoException({
          errorCode: RepoErrorCode.NOT_FOUND,
          message: `Record to update not found for Identification with ID: '${id}'`,
        });
      }
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error updating the Identification with ID: '${id}'`,
      });
    }
  }

  async getIdentificationForConsumer(consumerID: string, id: string): Promise<Identification> {
    try {
      const returnedIdentification: PrismaIdentificationModel = await this.prisma.identification.findFirst({
        where: {
          id: id,
          consumerID: consumerID,
        },
      });
      return convertToDomainIdentification(returnedIdentification);
    } catch (err) {
      return null;
    }
  }

  async getAllIdentificationsForConsumer(consumerID: string): Promise<Identification[]> {
    try {
      const identificationFilter: Prisma.IdentificationWhereInput = {
        consumerID: consumerID,
      };

      const returnedIdentifications: PrismaIdentificationModel[] = await this.prisma.identification.findMany({
        where: identificationFilter,
      });

      return returnedIdentifications.map(identification => convertToDomainIdentification(identification));
    } catch (err) {
      return [];
    }
  }

  async deleteIdentification(id: string): Promise<void> {
    try {
      await this.prisma.identification.delete({ where: { id: id } });
    } catch (e) {
      throw new RepoException({
        errorCode: RepoErrorCode.NOT_FOUND,
        message: `Identification with id ${id} not found!`,
      });
    }
  }

  async addConsumerConfiguration(configuration: ConsumerConfigurationCreateRequest): Promise<ConsumerConfiguration> {
    validateCreateConsumerConfigurationRequest(configuration);
    let savedConfiguration: ConsumerConfiguration = null;

    try {
      const configurationInput: Prisma.ConsumerConfigurationCreateInput = {
        consumer: {
          connect: {
            id: configuration.consumerID,
          },
        },
        name: configuration.name,
        value: configuration.value,
      };

      const returnedConfiguration: PrismaConfigurationModel = await this.prisma.consumerConfiguration.create({
        data: configurationInput,
      });
      savedConfiguration = convertToDomainConsumerConfiguration(returnedConfiguration);
    } catch (err) {
      if (err.code === "P2025") {
        throw new RepoException({
          errorCode: RepoErrorCode.NOT_FOUND,
          message: `Failed to store Configuration in database because consumer with id ${configuration.consumerID} was not found`,
        });
      }
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: "Error saving Configuration in database",
      });
    }

    try {
      validateConsumerConfiguration(savedConfiguration);
      return savedConfiguration;
    } catch (err) {
      throw new RepoException({
        errorCode: RepoErrorCode.INVALID_DATABASE_RECORD,
        message: "Error saving Configuration in database",
      });
    }
  }

  async updateConsumerConfiguration(
    id: string,
    configuration: ConsumerConfigurationUpdateRequest,
  ): Promise<ConsumerConfiguration> {
    validateUpdateConsumerConfigurationRequest(configuration);

    try {
      const configurationUpdateInput: Prisma.ConsumerConfigurationUpdateInput = {
        ...(configuration.value && { value: configuration.value }),
      };

      const returnedConfiguration: PrismaConfigurationModel = await this.prisma.consumerConfiguration.update({
        data: configurationUpdateInput,
        where: {
          id: id,
        },
      });

      return convertToDomainConsumerConfiguration(returnedConfiguration);
    } catch (err) {
      if (err.meta && err.meta.cause === "Record to update not found.") {
        throw new RepoException({
          errorCode: RepoErrorCode.NOT_FOUND,
          message: `Record to update not found for Configuration with ID: '${id}'`,
        });
      }
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error updating the Configuration with ID: '${id}'`,
      });
    }
  }

  async getAllConfigurationsForConsumer(consumerID: string): Promise<ConsumerConfiguration[]> {
    try {
      const returnedConfiguration: PrismaConfigurationModel[] = await this.prisma.consumerConfiguration.findMany({
        where: {
          consumerID: consumerID,
        },
      });
      return returnedConfiguration.map(configuration => convertToDomainConsumerConfiguration(configuration));
    } catch (err) {
      return [];
    }
  }

  async deleteConsumerConfiguration(id: string): Promise<void> {
    try {
      await this.prisma.consumerConfiguration.delete({ where: { id: id } });
    } catch (e) {
      throw new RepoException({
        errorCode: RepoErrorCode.NOT_FOUND,
        message: `Configuration with id ${id} not found!`,
      });
    }
  }
}
