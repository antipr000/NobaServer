import { Inject, Injectable, NotFoundException, NotImplementedException } from "@nestjs/common";
import { PartnerAdmin, PartnerAdminProps } from "./domain/PartnerAdmin";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IPartnerAdminRepo } from "./repo/PartnerAdminRepo";
import { TransactionDTO } from "../transactions/dto/TransactionDTO";
import { Result } from "../../core/logic/Result";

@Injectable()
export class PartnerAdminService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("PartnerAdminRepo")
  private readonly partnerAdminRepo: IPartnerAdminRepo;

  constructor() {}

  async getPartnerAdmin(partnerAdminId: string): Promise<PartnerAdmin> {
    const partnerAdmin: Result<PartnerAdmin> = await this.partnerAdminRepo.getPartnerAdmin(partnerAdminId);
    if (partnerAdmin.isSuccess) return partnerAdmin.getValue();
    else throw new NotFoundException("Partner Admin not found");
  }

  async getPartnerAdminFromEmail(emailID: string): Promise<PartnerAdmin> {
    const partnerAdmin: Result<PartnerAdmin> = await this.partnerAdminRepo.getPartnerAdminUsingEmail(emailID);
    if (partnerAdmin.isSuccess) return partnerAdmin.getValue();
    else throw new NotFoundException("Admin with given email does not exist");
  }

  async addAdminForPartner(partnerId: string, emailId: string, name: string, role: string): Promise<PartnerAdmin> {
    const newPartnerAdmin = PartnerAdmin.createPartnerAdmin({
      email: emailId,
      role: role,
      name: name,
      partnerId: partnerId,
    });
    const partnerAdmin: PartnerAdmin = await this.partnerAdminRepo.addPartnerAdmin(newPartnerAdmin);
    return partnerAdmin;
  }

  async deleteAdminForPartner(partnerId: string, partnerAdminId: string): Promise<PartnerAdmin> {
    const currentPartnerAdmin: PartnerAdmin = await this.getPartnerAdmin(partnerAdminId);
    if (currentPartnerAdmin.props.partnerId !== partnerId) {
      throw new NotFoundException(
        `PartnerAdmin with ID '${partnerAdminId}' does not exists in Partner with ID '${partnerId}'`,
      );
    }

    await this.partnerAdminRepo.removePartnerAdmin(partnerAdminId);
    return currentPartnerAdmin;
  }

  async updateAdminForPartner(
    partnerId: string,
    partnerAdminId: string,
    partnerAdminProps: Partial<PartnerAdminProps>,
  ): Promise<PartnerAdmin> {
    const partnerAdminToUpdate: PartnerAdmin = await this.getPartnerAdmin(partnerAdminId);
    if (partnerAdminToUpdate.props.partnerId !== partnerId) {
      throw new NotFoundException(
        `PartnerAdmin with ID '${partnerAdminId}' does not exists in Partner with ID '${partnerId}'`,
      );
    }
    const updatedPartnerAdmin = PartnerAdmin.createPartnerAdmin({
      ...partnerAdminToUpdate.props,
      ...partnerAdminProps,
    });
    return await this.partnerAdminRepo.updatePartnerAdmin(updatedPartnerAdmin);
  }

  async getAllPartnerAdmins(partnerId: string): Promise<PartnerAdmin[]> {
    const partnerAdmins: PartnerAdmin[] = await this.partnerAdminRepo.getAllAdminsForPartner(partnerId);
    return partnerAdmins;
  }

  async getAllConsumersForPartner(partnerId: string): Promise<any> {
    throw new NotImplementedException("Method not implemented");
  }

  async getAllTransactionsForPartner(partnerId: string): Promise<TransactionDTO[]> {
    throw new Error("Method not implemented");
  }
}
