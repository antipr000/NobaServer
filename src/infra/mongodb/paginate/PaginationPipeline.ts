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
      $group: {
        // we are not actually grouping, we are just using the $group stage to get the count
        _id: "_id",
        totalItems: {
          $sum: 1,
        },
        items: {
          $push: "$$ROOT",
        },
      },
    },

    {
      $project: {
        items: {
          $slice: [
            "$items",
            skip,
            {
              $ifNull: [pageLimit, "$totalItems"],
            },
          ],
        },
        page: {
          $literal: skip / pageLimit + 1,
        },
        hasNextPage: {
          $lt: [{ $multiply: [pageLimit, Number(page)] }, "$totalItems"],
        },
        totalPages: {
          $divide: ["$totalItems", pageLimit],
        },
        totalItems: "$totalItems",
      },
    },
  ];
};

/**
 * 
 * DocumentDB doesn't support faceting yet so we are using 2 different stages above to get the total and data
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
 */
