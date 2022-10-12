import { TestingModule, Test } from "@nestjs/testing";
import { deepEqual, instance, when } from "ts-mockito";
import { PartnerService } from "../partner.service";
import { getMockPartnerAdminServiceWithDefaults } from "../mocks/mock.partner.admin.service";
import { getMockPartnerServiceWithDefaults } from "../mocks/mock.partner.service";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { PartnerAdminService } from "../partneradmin.service";
import { PartnerMapper } from "../mappers/PartnerMapper";
import { PartnerAdminMapper } from "../mappers/PartnerAdminMapper";
import { PartnerController } from "../partner.controller";
import { PartnerAdmin } from "../domain/PartnerAdmin";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Partner } from "../domain/Partner";
import { Transaction } from "../../../modules/transactions/domain/Transaction";
import { TransactionStatus } from "../../../modules/transactions/domain/Types";
import { TransactionMapper } from "../../../modules/transactions/mapper/TransactionMapper";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { TransactionDTO } from "../../../modules/transactions/dto/TransactionDTO";
import { Consumer } from "../../../modules/consumer/domain/Consumer";

describe("PartnerController", () => {
  let partnerController: PartnerController;
  let partnerService: PartnerService;
  let partnerAdminService: PartnerAdminService;
  const partnerMapper: PartnerMapper = new PartnerMapper();
  const partnerAdminMapper: PartnerAdminMapper = new PartnerAdminMapper();
  const transactionMapper = new TransactionMapper();

  jest.setTimeout(30000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    partnerService = getMockPartnerServiceWithDefaults();
    partnerAdminService = getMockPartnerAdminServiceWithDefaults();

    const PartnerServiceProvider = {
      provide: PartnerService,
      useFactory: () => instance(partnerService),
    };

    const PartnerAdminServiceProvider = {
      provide: PartnerAdminService,
      useFactory: () => instance(partnerAdminService),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [PartnerController],
      providers: [PartnerServiceProvider, PartnerAdminServiceProvider],
    }).compile();

    partnerController = app.get<PartnerController>(PartnerController);
  });

  describe("partner service tests", () => {
    it("should add admin when admin with all access requests", async () => {
      const partnerAdminToAdd = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });
      const mockRequest = {
        user: {
          entity: requestingPartnerAdmin,
        },
      };

      when(
        partnerAdminService.addAdminForPartner(
          partnerAdminToAdd.props.partnerId,
          partnerAdminToAdd.props.email,
          partnerAdminToAdd.props.name,
          partnerAdminToAdd.props.role,
        ),
      ).thenResolve(partnerAdminToAdd);

      const result = await partnerController.addPartnerAdmin(
        {
          email: partnerAdminToAdd.props.email,
          name: partnerAdminToAdd.props.name,
          role: partnerAdminToAdd.props.role,
        },
        mockRequest,
      );

      expect(result).toStrictEqual(partnerAdminMapper.toDTO(partnerAdminToAdd));
    });

    it("should throw error when admin with basic access adds user", async () => {
      const partnerAdminToAdd = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });
      const mockRequest = {
        user: {
          entity: requestingPartnerAdmin,
        },
      };

      when(
        partnerAdminService.addAdminForPartner(
          partnerAdminToAdd.props.partnerId,
          partnerAdminToAdd.props.email,
          partnerAdminToAdd.props.name,
          partnerAdminToAdd.props.role,
        ),
      ).thenResolve(partnerAdminToAdd);

      try {
        await partnerController.addPartnerAdmin(
          {
            email: partnerAdminToAdd.props.email,
            name: partnerAdminToAdd.props.name,
            role: partnerAdminToAdd.props.role,
          },
          mockRequest,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw error when admin with intermediate access adds user", async () => {
      const partnerAdminToAdd = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: "mock-partner-2",
        role: "INTERMEDIATE",
      });
      const mockRequest = {
        user: {
          entity: requestingPartnerAdmin,
        },
      };

      when(
        partnerAdminService.addAdminForPartner(
          partnerAdminToAdd.props.partnerId,
          partnerAdminToAdd.props.email,
          partnerAdminToAdd.props.name,
          partnerAdminToAdd.props.role,
        ),
      ).thenResolve(partnerAdminToAdd);

      try {
        await partnerController.addPartnerAdmin(
          {
            email: partnerAdminToAdd.props.email,
            name: partnerAdminToAdd.props.name,
            role: partnerAdminToAdd.props.role,
          },
          mockRequest,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should get data of requesting partner admin", async () => {
      const partnerId = "mock-partner-1";
      const partnerAdminAllAccessId = "mock-partner-admin-1";
      const partnerAdminBasicAccessId = "mock-partner-admin-2";
      const partnerAdminIntermediateAccessId = "mock-partner-admin-3";

      const allAccessAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminAllAccessId,
        email: "mock@partner.com",
        partnerId: partnerId,
        role: "ALL",
      });
      const basicAccessAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminBasicAccessId,
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "BASIC",
      });
      const intermediateAccessAdmin = PartnerAdmin.createPartnerAdmin({
        _id: partnerAdminIntermediateAccessId,
        email: "moc3k@partner.com",
        partnerId: partnerId,
        role: "INTERMEDIATE",
      });

      when(partnerAdminService.getPartnerAdmin(allAccessAdmin.props._id)).thenResolve(allAccessAdmin);
      when(partnerAdminService.getPartnerAdmin(basicAccessAdmin.props._id)).thenResolve(basicAccessAdmin);
      when(partnerAdminService.getPartnerAdmin(intermediateAccessAdmin.props._id)).thenResolve(intermediateAccessAdmin);

      const allAccessResult = await partnerController.getPartnerAdmin(partnerAdminAllAccessId, {
        user: { entity: allAccessAdmin },
      });
      const basicAccessResult = await partnerController.getPartnerAdmin(partnerAdminBasicAccessId, {
        user: { entity: basicAccessAdmin },
      });
      const intermediateAccessResult = await partnerController.getPartnerAdmin(partnerAdminIntermediateAccessId, {
        user: { entity: intermediateAccessAdmin },
      });

      expect(allAccessResult).toStrictEqual(partnerAdminMapper.toDTO(allAccessAdmin));
      expect(basicAccessResult).toStrictEqual(partnerAdminMapper.toDTO(basicAccessAdmin));
      expect(intermediateAccessResult).toStrictEqual(partnerAdminMapper.toDTO(intermediateAccessAdmin));
    });

    it("should get data of any admin with all access", async () => {
      const partnerId = "mock-partner-1";
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "BASIC",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partnerId,
        role: "ALL",
      });

      when(partnerAdminService.getPartnerAdmin(partnerAdmin.props._id)).thenResolve(partnerAdmin);

      const result = await partnerController.getPartnerAdmin(partnerAdmin.props._id, {
        user: {
          entity: requestingPartnerAdmin,
        },
      });

      expect(result).toStrictEqual(partnerAdminMapper.toDTO(partnerAdmin));
    });

    it("should throw error when getting data of a different admin with basic access", async () => {
      const partnerId = "mock-partner-1";
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partnerId,
        role: "ALL",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "BASIC",
      });

      when(partnerAdminService.getPartnerAdmin(partnerAdmin.props._id)).thenResolve(partnerAdmin);

      try {
        await partnerController.getPartnerAdmin(partnerAdmin.props._id, {
          user: {
            entity: requestingPartnerAdmin,
          },
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw error when getting data of a different admin with intermediate access", async () => {
      const partnerId = "mock-partner-1";
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partnerId,
        role: "ALL",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "BASIC",
      });

      when(partnerAdminService.getPartnerAdmin(partnerAdmin.props._id)).thenResolve(partnerAdmin);

      try {
        await partnerController.getPartnerAdmin(partnerAdmin.props._id, {
          user: {
            entity: requestingPartnerAdmin,
          },
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should get all admins when requesting user has all access", async () => {
      const partnerId = "mock-partner-1";
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partnerId,
        role: "ALL",
      });

      when(partnerAdminService.getAllPartnerAdmins(partnerId)).thenResolve([
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-1",
          email: "mock@partner.com",
          partnerId: partnerId,
          role: "ALL",
        }),
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "mock2@partner.com",
          partnerId: partnerId,
          role: "BASIC",
        }),
      ]);

      const result = await partnerController.getAllPartnerAdmins({
        user: {
          entity: requestingPartnerAdmin,
        },
      });

      expect(result.length).toBe(2);
    });

    it("should throw error when admin with basic access tries getting all admins", async () => {
      const partnerId = "mock-partner-1";
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "BASIC",
      });

      when(partnerAdminService.getAllPartnerAdmins(partnerId)).thenResolve([
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-1",
          email: "mock@partner.com",
          partnerId: partnerId,
          role: "ALL",
        }),
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "mock2@partner.com",
          partnerId: partnerId,
          role: "BASIC",
        }),
      ]);

      try {
        await partnerController.getAllPartnerAdmins({
          user: {
            entity: requestingPartnerAdmin,
          },
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw error when admin with intermediate access tries getting all admins", async () => {
      const partnerId = "mock-partner-1";
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partnerId,
        role: "INTERMEDIATE",
      });

      when(partnerAdminService.getAllPartnerAdmins(partnerId)).thenResolve([
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-1",
          email: "mock@partner.com",
          partnerId: partnerId,
          role: "ALL",
        }),
        PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "mock2@partner.com",
          partnerId: partnerId,
          role: "INTERMEDIATE",
        }),
      ]);

      try {
        await partnerController.getAllPartnerAdmins({
          user: {
            entity: requestingPartnerAdmin,
          },
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should get partner details", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: partner.props._id,
        role: "BASIC",
      });

      when(partnerService.getPartner(partner.props._id)).thenResolve(partner);

      const result = await partnerController.getPartner({
        user: {
          entity: requestingPartnerAdmin,
        },
      });

      expect(result).toStrictEqual(partnerMapper.toDTO(partner));
    });

    it("should throw NotFoundException when partner is missing", async () => {
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "mock2@partner.com",
        partnerId: "partner-1",
        role: "BASIC",
      });

      when(partnerService.getPartner("partner-1")).thenResolve(null);

      try {
        await partnerController.getPartner({
          user: {
            entity: requestingPartnerAdmin,
          },
        });
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });
    /*
    it("should update partner details when requesting admin has all access", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partner.props._id,
        role: "ALL",
      });

      const newTakeRate = 20;

      when(
        partnerService.updatePartner(
          partner.props._id,
          deepEqual({
            config: { fees: { takeRate: newTakeRate } },
          }),
        ),
      ).thenResolve(
        Partner.createPartner({
          ...partner.props,
          config: { fees: { takeRate: newTakeRate } },
        }),
      );

      const result = await partnerController.updatePartner(
        {
          takeRate: newTakeRate,
        },
        {
          user: {
            entity: requestingPartnerAdmin,
          },
        },
      );

      expect(result).toStrictEqual(
        partnerMapper.toDTO(
          Partner.createPartner({
            ...partner.props,
            config: { fees: { takeRate: newTakeRate } },
          }),
        ),
      );
    });*/

    it("throw error on update partner details when requesting admin has basic access", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partner.props._id,
        role: "BASIC",
      });

      const newTakeRate = 20;

      when(partnerService.updatePartner(partner.props._id, { takeRate: newTakeRate })).thenResolve(
        Partner.createPartner({
          ...partner.props,
          config: { fees: { takeRate: newTakeRate } as any, notificationConfig: [] },
        }),
      );

      try {
        await partnerController.updatePartner(
          {
            takeRate: newTakeRate,
          },
          {
            user: {
              entity: requestingPartnerAdmin,
            },
          },
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("throw error on update partner details when requesting admin has intermediate access", async () => {
      const partner = Partner.createPartner({
        _id: "mock-partner-1",
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });
      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        email: "mock@partner.com",
        partnerId: partner.props._id,
        role: "INTERMEDIATE",
      });

      const newTakeRate = 20;

      when(partnerService.updatePartner(partner.props._id, { takeRate: newTakeRate })).thenResolve(
        Partner.createPartner({
          ...partner.props,
          config: { fees: { takeRate: newTakeRate } as any, notificationConfig: [] },
        }),
      );
      try {
        await partnerController.updatePartner(
          {
            takeRate: newTakeRate,
          },
          {
            user: {
              entity: requestingPartnerAdmin,
            },
          },
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should update partner admin details when requesting admin has ALL access", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "Old Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      const updatedPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "New Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "INTERMEDIATE",
      });

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "moc2k@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });

      when(
        partnerAdminService.updateAdminForPartner(
          requestingPartnerAdmin.props.partnerId,
          partnerAdmin.props._id,
          deepEqual({
            name: updatedPartnerAdmin.props.name,
            role: updatedPartnerAdmin.props.role,
          }),
        ),
      ).thenResolve(updatedPartnerAdmin);

      const result = await partnerController.updatePartnerAdmin(
        partnerAdmin.props._id,
        {
          name: updatedPartnerAdmin.props.name,
          role: updatedPartnerAdmin.props.role,
        },
        {
          user: {
            entity: requestingPartnerAdmin,
          },
        },
      );

      expect(result).toStrictEqual(partnerAdminMapper.toDTO(updatedPartnerAdmin));
    });

    it("should throw 'NotFoundException' if the partner admin to be updated belongs to different partner", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "Old Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-2",
        role: "BASIC",
      });

      const updatedPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "New Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-2",
        role: "INTERMEDIATE",
      });

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "moc2k@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });

      when(
        partnerAdminService.updateAdminForPartner(
          requestingPartnerAdmin.props.partnerId,
          partnerAdmin.props._id,
          deepEqual({
            name: updatedPartnerAdmin.props.name,
            role: updatedPartnerAdmin.props.role,
          }),
        ),
      ).thenReject(new NotFoundException());

      try {
        await partnerController.updatePartnerAdmin(
          partnerAdmin.props._id,
          {
            name: updatedPartnerAdmin.props.name,
            role: updatedPartnerAdmin.props.role,
          },
          {
            user: {
              entity: requestingPartnerAdmin,
            },
          },
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });

    it("should throw 'ForbiddenException' if requesting user has BASIC access", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "Old Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      const updatedPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "New Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "INTERMEDIATE",
      });

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "moc2k@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      when(
        partnerAdminService.updateAdminForPartner(
          requestingPartnerAdmin.props.partnerId,
          partnerAdmin.props._id,
          deepEqual({
            name: updatedPartnerAdmin.props.name,
            role: updatedPartnerAdmin.props.role,
          }),
        ),
      ).thenResolve(updatedPartnerAdmin);

      try {
        await partnerController.updatePartnerAdmin(
          partnerAdmin.props._id,
          {
            name: updatedPartnerAdmin.props.name,
            role: updatedPartnerAdmin.props.role,
          },
          {
            user: {
              entity: requestingPartnerAdmin,
            },
          },
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw 'ForbiddenException' if requesting user has INTERMEDIATE access", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "Old Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      const updatedPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "New Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "INTERMEDIATE",
      });

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "moc2k@partner.com",
        partnerId: "mock-partner-1",
        role: "INTERMEDIATE",
      });

      when(
        partnerAdminService.updateAdminForPartner(
          requestingPartnerAdmin.props.partnerId,
          partnerAdmin.props._id,
          deepEqual({
            name: updatedPartnerAdmin.props.name,
            role: updatedPartnerAdmin.props.role,
          }),
        ),
      ).thenResolve(updatedPartnerAdmin);

      try {
        await partnerController.updatePartnerAdmin(
          partnerAdmin.props._id,
          {
            name: updatedPartnerAdmin.props.name,
            role: updatedPartnerAdmin.props.role,
          },
          {
            user: {
              entity: requestingPartnerAdmin,
            },
          },
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should delete a partner admin when requesting partner admin has ALL access", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "Old Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "moc2k@partner.com",
        partnerId: "mock-partner-1",
        role: "ALL",
      });

      when(
        partnerAdminService.deleteAdminForPartner(requestingPartnerAdmin.props.partnerId, partnerAdmin.props._id),
      ).thenResolve(partnerAdmin);

      const result = await partnerController.deletePartnerAdmin(partnerAdmin.props._id, {
        user: {
          entity: requestingPartnerAdmin,
        },
      });

      expect(result).toStrictEqual(partnerAdminMapper.toDTO(partnerAdmin));
    });

    it("should throw 'ForbiddenException' requesting partner admin has BASIC access", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "Old Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "moc2k@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      when(
        partnerAdminService.deleteAdminForPartner(requestingPartnerAdmin.props.partnerId, partnerAdmin.props._id),
      ).thenResolve(partnerAdmin);

      try {
        await partnerController.deletePartnerAdmin(partnerAdmin.props._id, {
          user: {
            entity: requestingPartnerAdmin,
          },
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    it("should throw 'ForbiddenException' when requesting partner admin has INTERMEDIATE access", async () => {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-1",
        name: "Old Name",
        email: "mock@partner.com",
        partnerId: "mock-partner-1",
        role: "BASIC",
      });

      const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
        _id: "mock-partner-admin-2",
        email: "moc2k@partner.com",
        partnerId: "mock-partner-1",
        role: "INTERMEDIATE",
      });

      when(
        partnerAdminService.deleteAdminForPartner(requestingPartnerAdmin.props.partnerId, partnerAdmin.props._id),
      ).thenResolve(partnerAdmin);

      try {
        await partnerController.deletePartnerAdmin(partnerAdmin.props._id, {
          user: {
            entity: requestingPartnerAdmin,
          },
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });

    describe("GET /admins/transactions", () => {
      it("should return all transactions for partner", async () => {
        const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "moc2k@partner.com",
          partnerId: "mock-partner-1",
          role: "ALL",
        });

        const transaction = Transaction.createTransaction({
          _id: "fake-transaction-id",
          userId: "user-id-1",
          sessionKey: "fake-session-key",
          paymentMethodID: "fake-payment-token",
          leg1Amount: 100,
          leg2Amount: 0.1,
          leg1: "USD",
          leg2: "ETH",
          transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
          partnerID: "fake-partner",
          destinationWalletAddress: "fake-wallet",
          transactionTimestamp: new Date(),
        });

        const transactionDTO = transactionMapper.toDTO(transaction);

        const allTransactionsResult: PaginatedResult<TransactionDTO> = {
          items: [transactionDTO],
          page: 1,
          hasNextPage: false,
          totalPages: 1,
          totalItems: 1,
        };
        when(
          partnerService.getAllTransactionsForPartner(requestingPartnerAdmin.props.partnerId, deepEqual({})),
        ).thenResolve(allTransactionsResult);

        const response = await partnerController.getTransactions(
          {
            user: { entity: requestingPartnerAdmin },
          },
          {},
        );

        expect(response.totalItems).toBe(1);
        expect(response.items[0]).toStrictEqual(transactionDTO);
      });

      it("should throw ForbiddenException if requesting user is not PartnerAdmin", async () => {
        const user = Consumer.createConsumer({
          _id: "fake-consumer-id",
          email: "fake+consumer@noba.com",
          partners: [{ partnerID: "partner-1" }],
        });

        try {
          await partnerController.getTransactions(
            {
              user: { entity: user },
            },
            {},
          );
        } catch (e) {
          expect(e).toBeInstanceOf(ForbiddenException);
          expect(e.message).toBe("Only partner admins can access this endpoint");
        }
      });

      it("should throw ForbiddenException if requesting user does not have proper privilege", async () => {
        const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "moc2k@partner.com",
          partnerId: "mock-partner-1",
          role: "BASIC",
        });

        try {
          await partnerController.getTransactions(
            {
              user: { entity: requestingPartnerAdmin },
            },
            {},
          );
        } catch (e) {
          expect(e).toBeInstanceOf(ForbiddenException);
          expect(e.message).toBe("You do not have sufficient privileges to view all transactions");
        }
      });
    });

    describe("GET /admins/transaction/:transactionID", () => {
      it("should return all transactions for partner", async () => {
        const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "moc2k@partner.com",
          partnerId: "mock-partner-1",
          role: "ALL",
        });

        const transaction = Transaction.createTransaction({
          _id: "fake-transaction-id",
          userId: "user-id-1",
          sessionKey: "fake-session-key",
          paymentMethodID: "fake-payment-token",
          leg1Amount: 100,
          leg2Amount: 0.1,
          leg1: "USD",
          leg2: "ETH",
          transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
          partnerID: "mock-partner-1",
          destinationWalletAddress: "fake-wallet",
          transactionTimestamp: new Date(),
        });

        const transactionDTO = transactionMapper.toDTO(transaction);

        when(partnerService.getTransaction(transaction.props._id)).thenResolve(transactionDTO);
        const response = await partnerController.getTransaction(
          {
            user: { entity: requestingPartnerAdmin },
          },
          transaction.props._id,
        );
        expect(response).toStrictEqual(transactionDTO);
      });

      it("should throw ForbiddenException if requesting user is not PartnerAdmin", async () => {
        const user = Consumer.createConsumer({
          _id: "fake-consumer-id",
          email: "fake+consumer@noba.com",
          partners: [{ partnerID: "partner-1" }],
        });

        try {
          await partnerController.getTransaction(
            {
              user: { entity: user },
            },
            "transaction-1",
          );
        } catch (e) {
          expect(e).toBeInstanceOf(ForbiddenException);
          expect(e.message).toBe("Only partner admins can access this endpoint");
        }
      });

      it("should throw ForbiddenException if requesting user does not have proper privilege", async () => {
        const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "moc2k@partner.com",
          partnerId: "mock-partner-1",
          role: "BASIC",
        });

        try {
          await partnerController.getTransaction(
            {
              user: { entity: requestingPartnerAdmin },
            },
            "transaction-1",
          );
        } catch (e) {
          expect(e).toBeInstanceOf(ForbiddenException);
          expect(e.message).toBe("You do not have sufficient privileges to view the requested transaction");
        }
      });

      it("should throw NotFoundException if transactionID does not exist for given partner", async () => {
        const requestingPartnerAdmin = PartnerAdmin.createPartnerAdmin({
          _id: "mock-partner-admin-2",
          email: "moc2k@partner.com",
          partnerId: "mock-partner-1",
          role: "ALL",
        });

        const transaction = Transaction.createTransaction({
          _id: "fake-transaction-id",
          userId: "user-id-1",
          sessionKey: "fake-session-key",
          paymentMethodID: "fake-payment-token",
          leg1Amount: 100,
          leg2Amount: 0.1,
          leg1: "USD",
          leg2: "ETH",
          transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
          partnerID: "mock-partner-2",
          destinationWalletAddress: "fake-wallet",
          transactionTimestamp: new Date(),
        });

        const transactionDTO = transactionMapper.toDTO(transaction);

        when(partnerService.getTransaction(transaction.props._id)).thenResolve(transactionDTO);
        try {
          await partnerController.getTransaction(
            {
              user: { entity: requestingPartnerAdmin },
            },
            transaction.props._id,
          );
        } catch (e) {
          expect(e).toBeInstanceOf(NotFoundException);
          expect(e.message).toBe("Transaction does not exist");
        }
      });
    });
  });
});
