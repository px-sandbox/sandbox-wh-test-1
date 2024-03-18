/* eslint-disable max-lines-per-function */
/* eslint-disable no-await-in-loop */
import { logger } from 'core';
import { DynamoDbDocClient, DynamoDbDocClientGh } from '@pulse/dynamodb';
import { Table } from 'sst/node/table';
import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Github } from 'abstraction';
import moment from 'moment';
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
async function fetchDDRecords(
  libNames: string[]
): Promise<{ [key: string]: { libname: string; version: string; releaseDate: string } }> {
  const libKeys = libNames.map((libName) => ({ libName }));

  const ddClient = DynamoDbDocClientGh.getInstance();
  const tableIndex = Table.libMaster.tableName;
  let results: Github.Type.LibraryRecord[] = [];

  // we are chunking array of keys into 100 keys each, as dynamo db can only take 100 keys at a time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunk = (arr: any[], size: number): any[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );

  const keysChunks = chunk(libKeys, 100);

  // will store final result in this obj
  const resObj: { [key: string]: { libname: string; version: string; releaseDate: string } } = {};

  for (const keys of keysChunks) {
    const params = {
      RequestItems: {
        [tableIndex]: {
          Keys: keys,
        },
      },
    };

    try {
      const data = await ddClient.batchGet(params);
      logger.info('Items:', data);
      if (data && data[tableIndex]) {
        results = [...results, ...(data[tableIndex] as Github.Type.LibraryRecord[])];
      }
    } catch (err) {
      logger.error('Error fetching DD record items:', err);
    }
  }
  // storing result in key format to optimise search
  results.forEach((res) => {
    resObj[res.libName] = {
      libname: res.libName,
      version: res.version,
      releaseDate: res.releaseDate,
    };
  });

  return resObj;
}

/**
 * Retrieves the upgraded version data for the given repository IDs.
 * @param repoIds An array of repository IDs.
 * @returns A promise that resolves to an array of RepoLibType objects representing the upgraded version data.
 */
async function getESVersionUpgradeData(
  repoIds: string[],
  searchString: string
): Promise<Github.Type.ESVersionUpgradeType> {
  /* ESB QUERY FOR SEARCHING AND GETTING REPO-LIBRARY DATA FROM ELASTIC SEARCH */
  const repoLibQuery = esb
    .boolQuery()
    .must(esb.termQuery('body.isDeleted', false))
    .should([esb.termsQuery('body.repoId', repoIds), esb.termsQuery('body.id', repoIds)])
    .minimumShouldMatch(1);

  // If search is given then we add that to query to fetched only searched records
  if (searchString) {
    repoLibQuery.must(esb.wildcardQuery('body.libName', `*${searchString.toLowerCase()}*`));
  }

  // final repo Libs query to be passed to elastic search
  const finalRepoLibQuery = repoLibQuery.toJSON();

  // continually fetching repo-library data from elastic search until all data is fetched
  const repoLibData = []; // array to store repo-library data
  let counter = 1; // counter for the loop to fetch data from elastic search
  let repoLibs; // variable to store fetched-formatted-data from elastic search inside loop

  // we will fetch data from elastic search continuously, until we get empty array, to get all records
  do {
    const data = await esClientObj.searchWithEsb(
      Github.Enums.IndexName.GitRepoLibrary,
      finalRepoLibQuery,
      100 * (counter - 1),
      100,
      ['body.libName'],
  );

    repoLibs = await searchedDataFormator(data?.body);

    if (repoLibs?.length) {
      repoLibData.push(...repoLibs);
      counter += 1;
    }
  } while (repoLibs?.length);

  /* FETCHING REPONAMES DATA FROM ELASTIC SEARCH */

  const repoNamesQuery = esb
    .boolQuery()
    .should([esb.termsQuery('body.repoId', repoIds), esb.termsQuery('body.id', repoIds)])
    .minimumShouldMatch(1)
    .toJSON();

  const repoNamesArr: Github.Type.RepoNameType[] = []; // array to store repoNames data
  let counter2 = 1; // counter for the loop to fetch data from elastic search
  let repoNames; // variable to store fetched-formatted-data from elastic search inside loop

  // we will fetch data from elastic search continuously, until we get empty array, to get all records
  do {
    const repoNamesData = await esClientObj.searchWithEsb(
      Github.Enums.IndexName.GitRepo,
      repoNamesQuery,  
      100 * (counter2 - 1),
      100,
    );

    repoNames = await searchedDataFormator(repoNamesData.body);

    if (repoNames?.length) {
      repoNamesArr.push(...repoNames);
      counter2 += 1;
    }
  } while (repoNames?.length);

  // making a dictionary with repoId as key and repoName as value for easy access
  const repoNamesObj: { [key: string]: string } = {};
  repoNamesArr.forEach((names) => {
    repoNamesObj[names.id] = names.name;
  });

  const libNames: string[] = []; // array to store libNames data. Will be used in getVersionUpgrades()
  /* ADDING REPONAME TO REPOLIBDATA */
  const updatedRepoLibs = repoLibData.map((lib: Github.Type.RepoLibType) => {
    libNames.push(lib.libName);
    return {
      ...lib,
      repoName: repoNamesObj[lib.repoId] ?? '',
      currVerDate: lib.releaseDate,
      currVer: lib.version,
    };
  });

  return { updatedRepoLibs, libNames };
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
  sort?: Github.Type.VersionUpgradeSortType
): Promise<Github.Type.VerUpgFinalRes> {
  try {
    // fetching repo-library data from elastic search
    const { updatedRepoLibs, libNames } = await getESVersionUpgradeData(repoIds, search);

    if (!updatedRepoLibs?.length) {
      return { versionData: [], page, totalPages: 0 };
    }

    // fetching records from dynamo db for latest version and release date
    const ddRecords = await fetchDDRecords([...new Set(libNames)]);

    // adding latest version and release date to repo-library data
    const finalData = updatedRepoLibs?.map((lib: Github.Type.RepoLibType) => {
      const latestVerData = ddRecords[lib?.libName];
      const current = moment(lib?.currVerDate);
      const latest = moment(latestVerData?.releaseDate);
      const diffMonth = latest?.diff(current, 'months');
      return {
        ...lib,
        latestVerDate: latestVerData?.releaseDate ?? '',
        latestVer: latestVerData?.version ?? '',
        dateDiff: diffMonth ?? undefined,
      };
    });
    // If no final data then we return empty response
    if (!finalData?.length) {
      return { versionData: [], page, totalPages: 0 };
    }
    const totalPages = Math.ceil(finalData.length / limit);

    // sorting data
    const sortedData = await sortData(finalData, sort);

    // paginating data
    const paginatedData = await paginate(sortedData, page, limit);
    return { versionData: paginatedData, totalPages, page };
  } catch (e) {
    logger.error('versionUpgrade.error: Error while fetching version upgrades', e);
    throw e;
  }
}
