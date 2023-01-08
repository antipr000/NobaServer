import { PaginatedResult } from "../../../core/infra/PaginationTypes";

export type PaginateFunction = <T, K>(model: any, args?: K) => Promise<PaginatedResult<T>>;

type DomainConverterMethod<T> = (args: any) => T;

export const createPaginator = <T>(
  page: number,
  perPage: number,
  convertToDomainObject: DomainConverterMethod<T>,
): PaginateFunction => {
  return async (model, args: any = { where: undefined }) => {
    if (!page) page = 1;
    if (!perPage) perPage = 10;

    const skip = page > 0 ? perPage * (page - 1) : 0;
    const [total, data] = await Promise.all([
      model.count({ where: args.where }),
      model.findMany({
        ...args,
        take: perPage,
        skip,
      }),
    ]);
    const lastPage = Math.ceil(total / perPage);

    return {
      items: data.map(item => convertToDomainObject(item)),
      page: page,
      hasNextPage: page < lastPage,
      totalPages: lastPage,
      totalItems: total,
    };
  };
};
