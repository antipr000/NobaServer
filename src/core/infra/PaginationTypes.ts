import { KeysRequired } from "../../../src/modules/common/domain/Types";
import Joi from "joi";
import { ApiProperty } from "@nestjs/swagger";

export class PaginatedResult<T> {
  @ApiProperty()
  items: T[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalItems: number;
}

export const EMPTY_PAGE_RESULT: PaginatedResult<any> = {
  items: [],
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  page: 0,
};

const paginatedResultJoiSchemaKeys: KeysRequired<PaginatedResult<any>> = {
  items: Joi.array().required(),
  page: Joi.number().required(),
  hasNextPage: Joi.boolean().required(),
  totalPages: Joi.number().required(),
  totalItems: Joi.number().required(),
};

export const PaginatedResultJoiSchema = Joi.object(paginatedResultJoiSchemaKeys).meta({
  className: PaginatedResult.name,
});

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}
