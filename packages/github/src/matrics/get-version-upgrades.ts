/* eslint-disable no-await-in-loop */
import { logger } from 'core';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { Table } from 'sst/node/table';
import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Github } from 'abstraction';
import moment from 'moment';
import {
    DDRecordType,
    RepoLibType,
    RepoNameType,
    UpdatedRepoLibsType,
    VersionUpgradeSortType
} from 'abstraction/github/type';
import { LibraryRecord, VerUpgradeRes } from 'abstraction/github/type/aggregations/version-upgrades';
import { searchedDataFormator } from '../util/response-formatter';

// initializing elastic search client
const esClientObj = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
});

/**
 * Fetches library records from DynamoDB based on the provided library names.
 * @param libNames - An array of library names.
 * @returns A promise that resolves to an array of LibraryRecord objects.
 * @throws If there is an error fetching the items from DynamoDB.
 */
async function fetchDDRecords(libNames: string[]): Promise<LibraryRecord[]> {
    const keys = libNames.map(libName => ({ libName }));

    const params = {
        RequestItems: {
            [Table.libMaster.tableName]: {
                Keys: keys,
            },
        },
    };

    try {
        const data: Record<string, any> = await new DynamoDbDocClient().batchGet(params);
        logger.info('Items:', data);
        const tableIndex = Table.libMaster.tableName;

        return data[tableIndex];
    } catch (err) {
        logger.error('Error fetching items:', err);
        throw err;
    }
}

/**
 * Retrieves the upgraded version data for the given repository IDs.
 * @param repoIds An array of repository IDs.
 * @returns A promise that resolves to an array of UpdatedRepoLibsType objects representing the upgraded version data.
 */
async function getESVersionUpgradeData(repoIds: string[]): Promise<UpdatedRepoLibsType[]> {
    // query for searching and getting repo-name and repo-library data from elastic search
    const query = esb.boolQuery().
        should([esb.termsQuery('body.repoId', repoIds), esb.termsQuery('body.id', repoIds)]).
        minimumShouldMatch(1).toJSON();


    // continually fetching repo-library data from elastic search until all data is fetched
    const repoLibData = [];
    let counter = 1;
    let repoLibs;

    do {
        const data = await esClientObj.getClient().search({
            index: Github.Enums.IndexName.GitRepoLibrary,
            body: {
                query,
            },
            from: 100 * (counter - 1),
            size: 100,
        });

        repoLibs = await searchedDataFormator(data.body);

        if (repoLibs?.length) {
            repoLibData.push(...repoLibs);
            counter += 1;
        }
    } while (repoLibs?.length);


    const repoNamesArr: RepoNameType[] = [];
    let counter2 = 1;
    let repoNames;

    do {
        // fetching repoNames data from elastic search
        const repoNamesData = await esClientObj.getClient().search({
            index: Github.Enums.IndexName.GitRepo,
            body: {
                query,
            },
            from: 100 * (counter2 - 1),
            size: 100,
        });

        repoNames = await searchedDataFormator(repoNamesData.body);

        if (repoNames?.length) {
            repoNamesArr.push(...repoNames);
            counter2 += 1;
        }
    } while (repoNames?.length);


    // adding repoName to repoLibData
    const updatedRepoLibs = repoLibData.map((lib: RepoLibType) => {
        const matchingRepo = repoNamesArr.find((repo: RepoNameType) => repo.id === lib.repoId);

        return matchingRepo ?
            { ...lib, repoName: matchingRepo.name, currVerDate: lib.releaseDate, currVer: lib.version } :
            { ...lib, repoName: "", currVerDate: lib.releaseDate, currVer: lib.version };
    });
    return updatedRepoLibs;
}


/**
 * Sorts the version upgrade results by the "isCore" property.
 * @param a - The first version upgrade result.
 * @param b - The second version upgrade result.
 * @returns A number indicating the sort order.
 */
function sortByIsCore(a: VerUpgradeRes, b: VerUpgradeRes): number {
    return b.isCore ? 1 : -1;
}

/**
 * Sorts an array of VerUpgradeRes objects by date difference.
 * @param a - The first VerUpgradeRes object.
 * @param b - The second VerUpgradeRes object.
 * @returns A number indicating the sort order.
 */
function sortByDateDiff(a: VerUpgradeRes, b: VerUpgradeRes): number {
    return (b.dateDiff ?? 0) - (a.dateDiff ?? 0);
}

/**
 * Sorts an array of objects by a specified key in ascending or descending order.
 * @param a - The first object to compare.
 * @param b - The second object to compare.
 * @param key - The key to sort the objects by.
 * @param order - The order in which to sort the objects ('asc' for ascending, 'desc' for descending).
 * @returns A number indicating the sort order of the objects.
 */
function sortByKey(a: VerUpgradeRes, b: VerUpgradeRes, key: 'libName' | 'repoName', order: 'asc' | 'desc'): number {
    const aValue = a[key] || '';
    const bValue = b[key] || '';
    return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
}

/**
 * Sorts the given data array based on certain criteria.
 * @param data - The array of VerUpgradeRes objects to be sorted.
 * @param sort - Optional sorting criteria.
 * @returns A Promise that resolves to the sorted array of VerUpgradeRes objects.
 */
async function sortData(data: VerUpgradeRes[], sort?: VersionUpgradeSortType): Promise<VerUpgradeRes[]> {
    return data.sort((a, b) => {
        if (a.isCore !== b.isCore) {
            return sortByIsCore(a, b);
        }
        if ((a.dateDiff ?? 0) !== (b.dateDiff ?? 0)) {
            return sortByDateDiff(a, b);
        }
        if (sort && (a[sort.key] !== b[sort.key])) {
            return sortByKey(a, b, sort.key, sort.order);
        }
        return 0;
    });
}

/**
 * Paginates an array of data.
 * 
 * @param data - The array of data to be paginated.
 * @param page - The page number to retrieve.
 * @param limit - The number of items per page.
 * @returns A promise that resolves to the paginated array of data.
 */
async function paginate<T>(data: T[], page: number, limit: number): Promise<T[]> {
    const start = (page - 1) * limit;
    const end = page * limit;
    return data.slice(start, end);
}

/**
 * Retrieves the version upgrades for a given search query, page, limit, repository IDs, and optional sorting criteria.
 * @param search - The search query.
 * @param page - The page number.
 * @param limit - The maximum number of results per page.
 * @param repoIds - An array of repository IDs.
 * @param sort - Optional sorting criteria for the version upgrades.
 * @returns A promise that resolves to an array of version upgrade results.
 * @throws Throws an error if there is an issue retrieving the version upgrades.
 */
export async function getVersionUpgrades(
    search: string,
    page: number,
    limit: number,
    repoIds: string[],
    sort?: VersionUpgradeSortType,
): Promise<VerUpgradeRes[]> {
    try {

        // fetching repo-library data from elastic search
        const updatedRepoLibs = await getESVersionUpgradeData(repoIds);

        const libNames = updatedRepoLibs.map((lib: RepoLibType) => (lib.libName));

        // fetching records from dynamo db for latest version and release date
        const ddRecords: DDRecordType[] = await fetchDDRecords([...(new Set(libNames))]);

        // adding latest version and release date to repo-library data
        const finalData = updatedRepoLibs.map((lib: RepoLibType) => {
            const latestVerData = ddRecords.find((ddRecord: DDRecordType) => ddRecord.libName === lib.libName);
            const date1 = moment(lib.currVerDate);
            const date2 = moment(latestVerData?.releaseDate);
            const diffMonth = date2.diff(date1, 'months');
            return latestVerData ?
                {
                    ...lib, latestVerDate: latestVerData.releaseDate, latestVer: latestVerData.version,
                    dateDiff: diffMonth
                } :
                { ...lib, latestVerDate: '', latestVer: '', dateDiff: undefined };
        });

        // sorting data
        const sortedData = await sortData(finalData, sort);

        // paginating data
        const paginatedData = paginate(sortedData, page, limit);
        return paginatedData;

    } catch (e) {
        logger.error('versionUpgrade.error: Error while fetching version upgrades', e);
        throw e;
    }
}
