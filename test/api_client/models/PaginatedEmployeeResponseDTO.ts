/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { EmployeeResponseDTO } from "./EmployeeResponseDTO";

export type PaginatedEmployeeResponseDTO = {
  items: Array<EmployeeResponseDTO>;
  page: number;
  hasNextPage: boolean;
  totalPages: number;
  totalItems: number;
};
