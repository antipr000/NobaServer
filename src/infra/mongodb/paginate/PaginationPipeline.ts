import { FilterQuery } from "mongoose";
import { SortOrder } from "../../../core/infra/PaginationTypes";

export type SortOptions<T> = {
  order: SortOrder;
  field: keyof T;
};

export const paginationPipeLine = <T extends Record<string, any>>(
  pageOffset: number,
  pageLimit: number,
  filter: FilterQuery<T> = {},
  sortOptions?: SortOptions<T>,
) => {
  pageOffset = Number(pageOffset);
  pageLimit = Number(pageLimit);
  const page = pageOffset + 1;
  const skip = pageOffset * pageLimit;

  return [
    {
      $match: {
        ...filter,
      },
    },
    {
      ...(sortOptions && { $sort: { [sortOptions.field]: sortOptions.order == SortOrder.ASC ? 1 : -1 } }),
    },
    {
      $facet: {
        total: [
          {
            $count: "count",
          },
        ],
        data: [
          {
            $addFields: {
              _id: "$_id",
            },
          },
        ],
      },
    },
    {
      $unwind: "$total",
    },

    {
      $project: {
        items: {
          $slice: [
            "$data",
            skip,
            {
              $ifNull: [pageLimit, "$total.count"],
            },
          ],
        },
        page: {
          $literal: skip / pageLimit + 1,
        },
        hasNextPage: {
          $lt: [{ $multiply: [pageLimit, Number(page)] }, "$total.count"],
        },
        totalPages: {
          $ceil: {
            $divide: ["$total.count", pageLimit],
          },
        },
        totalItems: "$total.count",
      },
    },
  ];
};
