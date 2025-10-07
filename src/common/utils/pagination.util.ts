import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * Utility function for paginating, sorting, and searching TypeORM queries dynamically.
 *
 * @template T - The TypeORM entity type (must extend ObjectLiteral).
 *
 * @param query - TypeORM SelectQueryBuilder instance for the entity.
 * @param options - Pagination and search configuration options.
 *
 * @param options.page - The current page number (default: 1).
 * @param options.limit - The number of records per page (default: 10).
 * @param options.sort - The column name to sort by (default: 'createdAt').
 * @param options.order - Sorting order: 'ASC' or 'DESC' (case-insensitive, default: 'DESC').
 * @param options.search - Search keyword for filtering (optional).
 * @param options.searchableColumns - Array of column names to search in (optional).
 *
 * @returns A Promise that resolves to an object containing:
 * - `message`: Success message
 * - `data`: Array of records for the current page
 * - `total`: Total number of records found
 * - `currentPage`: Current page number
 * - `totalPages`: Total pages calculated from total records and limit
 * - `perPage`: Number of records per page
 */
export async function paginateAndSearch<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    options: {
        page?: number | string;
        limit?: number | string;
        sort?: string;
        order?: string;
        search?: string;
        searchableColumns?: string[];
    },
) {
    let {
        page = 1,
        limit = 10,
        sort = 'createdAt',
        order = 'DESC',
        search,
        searchableColumns = [],
    } = options;

    //  Sanitize and validate "page" and "limit"
    page = Number(page);
    limit = Number(limit);
    if (isNaN(page) || page <= 0) page = 1;
    if (isNaN(limit) || limit <= 0) limit = 10;

    //  Normalize "order" value (case-insensitive)
    order = (order || 'DESC').toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    //  Apply dynamic search across multiple columns using LIKE
    if (search && searchableColumns.length > 0) {
        const where = searchableColumns
            .map((col) => `${query.alias}.${col} LIKE :search`)
            .join(' OR ');
        query.andWhere(`(${where})`, { search: `%${search}%` });
    }

    //  Apply sorting dynamically
    query.orderBy(`${query.alias}.${sort}`, order as 'ASC' | 'DESC');

    //  Apply pagination logic
    query.skip((page - 1) * limit).take(limit);

    //  Execute query and return paginated result
    const [data, total] = await query.getManyAndCount();

    return {
        message: 'Data fetched successfully',
        data,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        perPage: limit,
    };
}
