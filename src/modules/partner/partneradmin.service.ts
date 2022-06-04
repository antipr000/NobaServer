import {
    ForbiddenException,
    Inject,
    Injectable,
    NotImplementedException,
  } from "@nestjs/common";
import { PartnerAdminProps, PartnerAdmin } from "./domain/PartnerAdmin";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IPartnerAdminRepo } from "./repo/PartnerAdminRepo";
import { UserService } from "../user/user.service";
import { TransactionService } from "../transactions/transaction.service";
import { TransactionDTO } from "../transactions/dto/TransactionDTO";
  
  @Injectable()
  export class PartnerAdminService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;
    
  
    constructor(
      private readonly partnerAdminRepo: IPartnerAdminRepo,
      private readonly userService: UserService,
      private readonly transactionService: TransactionService) {}
  
    async getPartnerAdmin(partnerAdminId: string): Promise<PartnerAdmin> {
        const partnerAdmin: PartnerAdmin = await this.partnerAdminRepo.getPartnerAdmin(partnerAdminId);
        return partnerAdmin;
    }

    async getPartnerAdminFromEmail(emailID: string): Promise<PartnerAdmin> {
        const partnerAdmin: PartnerAdmin = await this.partnerAdminRepo.getPartnerAdminUsingEmail(emailID);
        return partnerAdmin;
    }

    // Internal use only. Do not expose in controllers
    async addPartnerAdminInternal(partnerId: string, emailID: string): Promise<PartnerAdmin> {
        const newPartnerAdmin = PartnerAdmin.createPartnerAdmin({
            email: emailID,
            partnerId: partnerId
        });
        const partnerAdmin: PartnerAdmin = await this.partnerAdminRepo.addPartnerAdmin(newPartnerAdmin);
        return partnerAdmin;
    }

    async addPartnerAdmin(
        requestingPartnerAdmin: PartnerAdminProps,
         emailID: string): Promise<PartnerAdmin> {
        if(false) {
            // add permission check here
            throw new ForbiddenException();
        }

        return this.addPartnerAdminInternal(requestingPartnerAdmin.partnerId, emailID);
    }

    // Internal use only. Do not expose in controllers
    async deletePartnerAdminInternal(partnerAdminId: string): Promise<void> {
        this.partnerAdminRepo.removePartnerAdmin(partnerAdminId);
    }

    async deleteParterAdmin(
        requestingPartnerAdmin: PartnerAdminProps, 
        partnerAdminId: string): Promise<void> {
        if (false) {
            // check conditions here
            throw new ForbiddenException();
        }
        this.deletePartnerAdminInternal(partnerAdminId);
    }

    // Internal use only. Do not expose in controller
    async getAllPartnerAdminsInternal(partnerId: string): Promise<PartnerAdmin[]> {
        const partnerAdmins: PartnerAdmin[] = await this.partnerAdminRepo.getAllAdminsForPartner(partnerId);
        return partnerAdmins.map(partnerAdmin => partnerAdmin);
    }
    
    async getAllPartnerAdmins(requestingPartnerAdmin: PartnerAdminProps): Promise<PartnerAdmin[]> {
        if (false) {
            // add condition checks here
            throw new ForbiddenException();
        }

        return this.getAllPartnerAdminsInternal(requestingPartnerAdmin.partnerId);
    }

    async getAllUsersForPartner(partnerId: string): Promise<any> {
        throw new NotImplementedException("Method not implemented")
    }

    async getAllTransactionsForPartner(partnerId: string): Promise<TransactionDTO[]> {
        const transactions: TransactionDTO[] = await this.transactionService.getAllTransactions();
        return transactions;
    }
  }
  