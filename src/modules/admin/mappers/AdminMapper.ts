
import { Admin, AdminProps } from '../domain/Admin';
import { UserModel } from '../../../infra/dynamodb/UserModel';
import { Mapper } from '../../../core/infra/Mapper';
import { CrudOptions } from 'src/infra/dynamodb/DDBUtils';
import { NobaAdminDTO } from '../dto/NobaAdminDTO';
import { Injectable } from '@nestjs/common';
import { OutputNobaAdminDTO } from '../dto/OutputNobaAdminDTO';


export type AdminMinPropertySetForDBLookUp = Pick<AdminProps, "_id">

@Injectable()
export class AdminMapper implements Mapper<Admin> {
    public toPersistence(
        raw: AdminMinPropertySetForDBLookUp | Admin,
        options: CrudOptions
    ): UserModel {
        throw new Error("Method not implemented");
    }

    public toDomain(raw: any): Admin {
        return Admin.createAdmin(raw);
    }

    public toDTO(nobaAdmin: Admin): NobaAdminDTO {
        throw new Error("Method not implemented");
    }

    public toOutputDto(nobaAdmin: Admin): OutputNobaAdminDTO {
        const dto: OutputNobaAdminDTO = new OutputNobaAdminDTO();
        dto._id = nobaAdmin.props._id;
        dto.email = nobaAdmin.props.email;
        dto.name = nobaAdmin.props.name;
        dto.role = nobaAdmin.props.role;

        return dto;
    }

}

