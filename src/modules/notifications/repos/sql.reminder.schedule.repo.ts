import { Inject, Injectable } from "@nestjs/common";
import { ReminderScheduleRepo } from "./reminder.schedule.repo";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PrismaService } from "../../../infraproviders/PrismaService";
import {
  ReminderScheduleCreateRequest,
  ReminderSchedule,
  ReminderScheduleUpdateRequest,
  validateReminderScheduleCreateRequest,
  convertToDomainReminderSchedule,
  validateReminderSchedule,
  validateReminderScheduleUpdateRequest,
} from "../domain/ReminderSchedule";
import { Prisma, ReminderSchedule as PrismaReminderScheduleModel } from "@prisma/client";
import { RepoErrorCode, RepoException } from "../../../core/exception/repo.exception";
import { AlertService } from "../../../modules/common/alerts/alert.service";

@Injectable()
export class SQLReminderScheduleRepo implements ReminderScheduleRepo {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly prismaService: PrismaService;

  @Inject()
  private readonly alertService: AlertService;

  async createReminderSchedule(reminderSchedule: ReminderScheduleCreateRequest): Promise<ReminderSchedule> {
    validateReminderScheduleCreateRequest(reminderSchedule);

    let savedReminderSchedule: ReminderSchedule = null;

    try {
      const reminderScheduleCreateRequest: Prisma.ReminderScheduleCreateInput = {
        query: reminderSchedule.query,
        groupKey: reminderSchedule.groupKey,
        event: {
          connect: {
            id: reminderSchedule.eventID,
          },
        },
      };

      const returnedEventSchedule: PrismaReminderScheduleModel = await this.prismaService.reminderSchedule.create({
        data: reminderScheduleCreateRequest,
      });

      savedReminderSchedule = convertToDomainReminderSchedule(returnedEventSchedule);
    } catch (e) {
      this.alertService.raiseError(`Failed to create reminder schedule: ${e}`);
      throw new RepoException({
        message: "Failed to create reminder schedule",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }

    try {
      validateReminderSchedule(savedReminderSchedule);
      return savedReminderSchedule;
    } catch (e) {
      this.alertService.raiseError(`Failed to validate reminder schedule: ${e}`);
      throw new RepoException({
        message: "Failed to validate reminder schedule",
        errorCode: RepoErrorCode.INVALID_DATABASE_RECORD,
      });
    }
  }

  async updateReminderSchedule(id: string, reminderSchedule: ReminderScheduleUpdateRequest): Promise<ReminderSchedule> {
    validateReminderScheduleUpdateRequest(reminderSchedule);

    try {
      const reminderScheduleUpdateRequest: Prisma.ReminderScheduleUpdateInput = {
        ...(reminderSchedule.query && { query: reminderSchedule.query }),
        ...(reminderSchedule.groupKey && { groupKey: reminderSchedule.groupKey }),
      };

      const returnedReminderSchedule: PrismaReminderScheduleModel = await this.prismaService.reminderSchedule.update({
        where: {
          id: id,
        },
        data: reminderScheduleUpdateRequest,
      });

      return convertToDomainReminderSchedule(returnedReminderSchedule);
    } catch (e) {
      this.alertService.raiseError(`Failed to update reminder schedule: ${e}`);
      throw new RepoException({
        message: "Failed to update reminder schedule",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }
  }

  async getReminderScheduleByID(id: string): Promise<ReminderSchedule> {
    try {
      const reminderSchedule: PrismaReminderScheduleModel = await this.prismaService.reminderSchedule.findUnique({
        where: {
          id: id,
        },
      });

      return convertToDomainReminderSchedule(reminderSchedule);
    } catch (e) {
      this.alertService.raiseError(`Failed to get reminder schedule by ID: ${e}`);
      throw new RepoException({
        message: "Failed to get reminder schedule by ID",
        errorCode: RepoErrorCode.NOT_FOUND,
      });
    }
  }

  async getReminderScheduleByEventID(eventID: string): Promise<ReminderSchedule> {
    try {
      const reminderSchedule: PrismaReminderScheduleModel = await this.prismaService.reminderSchedule.findUnique({
        where: {
          eventID: eventID,
        },
      });

      return convertToDomainReminderSchedule(reminderSchedule);
    } catch (e) {
      this.alertService.raiseError(`Failed to get reminder schedule by event ID: ${e}`);
      throw new RepoException({
        message: "Failed to get reminder schedule by event ID",
        errorCode: RepoErrorCode.NOT_FOUND,
      });
    }
  }

  async getAllReminderSchedulesForGroup(groupKey: string): Promise<ReminderSchedule[]> {
    try {
      const reminderSchedules: PrismaReminderScheduleModel[] = await this.prismaService.reminderSchedule.findMany({
        where: {
          groupKey: groupKey,
        },
      });

      return reminderSchedules.map(reminderSchedule => convertToDomainReminderSchedule(reminderSchedule));
    } catch (e) {
      this.alertService.raiseError(`Failed to get all reminder schedules for group: ${e}`);
      throw new RepoException({
        message: "Failed to get all reminder schedules for group",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }
  }

  async deleteReminderSchedule(id: string): Promise<void> {
    try {
      await this.prismaService.reminderSchedule.delete({
        where: {
          id: id,
        },
      });
    } catch (e) {
      this.alertService.raiseError(`Failed to delete reminder schedule: ${e}`);
      throw new RepoException({
        message: "Failed to delete reminder schedule",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }
  }
}
