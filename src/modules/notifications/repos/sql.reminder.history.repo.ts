import { Inject, Injectable } from "@nestjs/common";
import { ReminderHistoryRepo } from "./reminder.history.repo";
import {
  ReminderHistoryCreateRequest,
  ReminderHistory,
  ReminderHistoryUpdateRequest,
  validateReminderHistoryCreateRequest,
  convertToDomainReminderHistory,
  validateReminderHistory,
  validateReminderHistoryUpdateRequest,
} from "../domain/ReminderHistory";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { Prisma, ReminderHistory as PrismaReminderHistoryModel } from "@prisma/client";
import { RepoErrorCode, RepoException } from "../../../core/exception/repo.exception";
import { AlertService } from "../../../modules/common/alerts/alert.service";

@Injectable()
export class SQLReminderHistoryRepo implements ReminderHistoryRepo {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly alertService: AlertService;

  @Inject()
  private readonly prismaService: PrismaService;

  async createReminderHistory(reminderHistory: ReminderHistoryCreateRequest): Promise<ReminderHistory> {
    validateReminderHistoryCreateRequest(reminderHistory);

    let savedReminderHistory: ReminderHistory = null;
    try {
      const reminderHistoryCreateRequest: Prisma.ReminderHistoryCreateInput = {
        lastSentTimestamp: reminderHistory.lastSentTimestamp,
        event: {
          connect: {
            id: reminderHistory.eventID,
          },
        },
        reminderSchedule: {
          connect: {
            id: reminderHistory.reminderScheduleID,
          },
        },
        consumer: {
          connect: {
            id: reminderHistory.consumerID,
          },
        },
      };

      const returnedReminderHistory: PrismaReminderHistoryModel = await this.prismaService.reminderHistory.create({
        data: reminderHistoryCreateRequest,
      });

      savedReminderHistory = convertToDomainReminderHistory(returnedReminderHistory);
    } catch (e) {
      this.alertService.raiseError(`Failed to create reminder history: ${e}`);
      throw new RepoException({
        message: "Failed to create reminder history",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }

    try {
      validateReminderHistory(savedReminderHistory);
      return savedReminderHistory;
    } catch (e) {
      this.alertService.raiseError(`Failed to validate reminder history: ${e}`);
      throw new RepoException({
        message: "Failed to validate reminder history",
        errorCode: RepoErrorCode.INVALID_DATABASE_RECORD,
      });
    }
  }

  async updateReminderHistory(id: string, reminderHistory: ReminderHistoryUpdateRequest): Promise<ReminderHistory> {
    validateReminderHistoryUpdateRequest(reminderHistory);

    try {
      const reminderHistoryUpdateRequest: Prisma.ReminderHistoryUpdateInput = {
        ...(reminderHistory.lastSentTimestamp && { lastSentTimestamp: reminderHistory.lastSentTimestamp }),
      };

      const returnedReminderHistory: PrismaReminderHistoryModel = await this.prismaService.reminderHistory.update({
        where: {
          id: id,
        },
        data: reminderHistoryUpdateRequest,
      });

      if (!returnedReminderHistory) return null;

      return convertToDomainReminderHistory(returnedReminderHistory);
    } catch (e) {
      this.alertService.raiseError(`Failed to update reminder history: ${e}`);
      throw new RepoException({
        message: "Failed to update reminder history",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }
  }

  async getReminderHistoryByID(id: string): Promise<ReminderHistory> {
    try {
      const returnedReminderHistory: PrismaReminderHistoryModel = await this.prismaService.reminderHistory.findUnique({
        where: {
          id: id,
        },
      });

      if (!returnedReminderHistory) return null;

      return convertToDomainReminderHistory(returnedReminderHistory);
    } catch (e) {
      this.alertService.raiseError(`Failed to get reminder history by ID: ${e}`);
      throw new RepoException({
        message: "Failed to get reminder history by ID",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }
  }

  async getReminderHistoryByReminderScheduleIDAndConsumerID(
    reminderScheduleID: string,
    consumerID: string,
  ): Promise<ReminderHistory> {
    try {
      const returnedReminderHistory: PrismaReminderHistoryModel = await this.prismaService.reminderHistory.findFirst({
        where: {
          reminderScheduleID: reminderScheduleID,
          consumerID: consumerID,
        },
        orderBy: {
          lastSentTimestamp: "desc",
        },
      });

      if (!returnedReminderHistory) return null;

      return convertToDomainReminderHistory(returnedReminderHistory);
    } catch (e) {
      this.alertService.raiseError(`Failed to get reminder history by reminder schedule ID and consumer ID: ${e}`);
      throw new RepoException({
        message: "Failed to get reminder history by reminder schedule ID and consumer ID",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }
  }

  async getLatestReminderHistoryForConsumer(consumerID: string): Promise<ReminderHistory> {
    try {
      const returnedReminderHistory: PrismaReminderHistoryModel = await this.prismaService.reminderHistory.findFirst({
        where: {
          consumerID: consumerID,
        },
        orderBy: {
          lastSentTimestamp: "desc",
        },
      });

      if (!returnedReminderHistory) return null;

      return convertToDomainReminderHistory(returnedReminderHistory);
    } catch (e) {
      this.alertService.raiseError(`Failed to get latest reminder history for consumer: ${e}`);
      throw new RepoException({
        message: "Failed to get latest reminder history for consumer",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }
  }
}
