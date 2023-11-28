/* eslint-disable no-await-in-loop */
import { logger } from 'core';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { Table } from 'sst/node/table';
import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Github } from 'abstraction';
import moment from 'moment';
import { LibraryRecord, VerUpgradeRes } from 'abstraction/github/type/aggregations/version-upgrades';
import { paginate, sortData } from '../util/version-upgrades';
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
 * @returns A promise that resolves to an array of RepoLibType objects representing the upgraded version data.
 */
async function getESVersionUpgradeData(repoIds: string[]): Promise<Github.Type.RepoLibType[]> {
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


    const repoNamesArr: Github.Type.RepoNameType[] = [];
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
    const updatedRepoLibs = repoLibData.map((lib: Github.Type.RepoLibType) => {
        const matchingRepo = repoNamesArr.find((repo: Github.Type.RepoNameType) => repo.id === lib.repoId);

        return matchingRepo ?
            { ...lib, repoName: matchingRepo.name, currVerDate: lib.releaseDate, currVer: lib.version } :
            { ...lib, repoName: "", currVerDate: lib.releaseDate, currVer: lib.version };
    });
    return updatedRepoLibs;
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
    sort?: Github.Type.VersionUpgradeSortType,
): Promise<VerUpgradeRes[]> {
    try {

        // fetching repo-library data from elastic search
        const updatedRepoLibs = await getESVersionUpgradeData(repoIds);

        const libNames = updatedRepoLibs.map((lib: Github.Type.RepoLibType) => (lib.libName));

        // fetching records from dynamo db for latest version and release date
        const ddRecords: Github.Type.DDRecordType[] = await fetchDDRecords([...(new Set(libNames))]);

        // adding latest version and release date to repo-library data
        const finalData = updatedRepoLibs.map((lib: Github.Type.RepoLibType) => {
            const latestVerData = ddRecords.
                find((ddRecord: Github.Type.DDRecordType) => ddRecord.libName === lib.libName);
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
