import { Inject, Injectable, NotFoundException, NotImplementedException } from "@nestjs/common";
import { PartnerAdmin } from "./domain/PartnerAdmin";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IPartnerAdminRepo } from "./repo/PartnerAdminRepo";
import { UserService } from "../user/user.service";
import { TransactionDTO } from "../transactions/dto/TransactionDTO";
import { Result } from "../../core/logic/Result";

@Injectable()
export class PartnerAdminService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("PartnerAdminRepo")
  private readonly partnerAdminRepo: IPartnerAdminRepo;

  constructor(private readonly userService: UserService) {}

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

  async addPartnerAdmin(partnerId: string, emailID: string): Promise<PartnerAdmin> {
    const newPartnerAdmin = PartnerAdmin.createPartnerAdmin({
      email: emailID,
      partnerId: partnerId,
    });
    const partnerAdmin: PartnerAdmin = await this.partnerAdminRepo.addPartnerAdmin(newPartnerAdmin);
    return partnerAdmin;
  }

  async deletePartnerAdmin(partnerAdminId: string): Promise<void> {
    this.partnerAdminRepo.removePartnerAdmin(partnerAdminId);
  }

  async getAllPartnerAdmins(partnerId: string): Promise<PartnerAdmin[]> {
    const partnerAdmins: PartnerAdmin[] = await this.partnerAdminRepo.getAllAdminsForPartner(partnerId);
    return partnerAdmins;
  }

  async getAllUsersForPartner(partnerId: string): Promise<any> {
    throw new NotImplementedException("Method not implemented");
  }

  async getAllTransactionsForPartner(partnerId: string): Promise<TransactionDTO[]> {
    throw new Error("Method not implemented");
  }
}
