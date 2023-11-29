import { Github } from "abstraction";
import { VerUpgradeRes, VersionUpgradeSortType } from "abstraction/github/type/aggregations/version-upgrades";
import _ from "lodash";

/**
 * Sorts the given data array based on certain criteria.
 * @param data - The array of VerUpgradeRes objects to be sorted.
 * @param sort - Optional sorting criteria.
 * @returns A Promise that resolves to the sorted array of VerUpgradeRes objects.
 */
export async function sortData(data: VerUpgradeRes[], sort?: VersionUpgradeSortType): Promise<VerUpgradeRes[]> {
    const sortKeys = [
        'isCore',
    ];
    const sortDir = [
        Github.Enums.SortOrder.DESC,
    ];


    if (sort?.key === Github.Enums.SortKey.DATEDIFF) {
        sortKeys.push(Github.Enums.SortKey.DATEDIFF);
        sortDir.push(sort.order);
    } else if (sort?.key === Github.Enums.SortKey.REPONAME || sort?.key === Github.Enums.SortKey.LIBNAME) {
        sortKeys.push(...[sort.key, Github.Enums.SortKey.DATEDIFF]);
        sortDir.push(...[sort.order, Github.Enums.SortOrder.DESC]);
    }

    return _.orderBy(data, sortKeys, sortDir);

}

/**
 * Paginates an array of data.
 * 
 * @param data - The array of data to be paginated.
 * @param page - The page number to retrieve.
 * @param limit - The number of items per page.
 * @returns A promise that resolves to the paginated array of data.
 */
export async function paginate<T>(data: T[], page: number, limit: number): Promise<T[]> {
    const start = (page - 1) * limit;
    const end = page * limit;
    return data.slice(start, end);
}