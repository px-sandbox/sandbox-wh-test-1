/* eslint-disable max-lines-per-function */
/* eslint-disable no-await-in-loop */
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { Table } from 'sst/node/table';
import { searchedDataFormator } from '../util/response-formatter';
import { paginate, sortData } from '../util/version-upgrades';

// initializing elastic search client
const esClientObj = ElasticSearchClient.getInstance();

/**
 * Fetches library records from DynamoDB based on the provided library names.
 * @param libNames - An array of library names.
 * @returns A promise that resolves to an array of LibraryRecord objects.
 * @throws If there is an error fetching the items from DynamoDB.
 */
async function fetchDDRecords(
  libNames: string[],
  requestId: string
): Promise<{ [key: string]: { libname: string; version: string; releaseDate: string } }> {
  const libKeys = libNames.map((libName) => ({ libName }));

  const ddClient = DynamoDbDocClient.getInstance();
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
      const data = await ddClient.batchGet<Record<string, Github.Type.LibraryRecord[]>>(params);
      if (data && data[tableIndex]) {
        results = [...results, ...(data[tableIndex] as Github.Type.LibraryRecord[])];
      }
    } catch (err) {
      logger.error({ message: 'Error fetching DD record items:', error: err, requestId });
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

const repoLibsQuery = async (
  repoIds: string[],
  searchString: string,
  counter: number
): Promise<any> => {
  const repoLibQuery = esb
    .requestBodySearch()
    .size(100)
    .from(100 * (counter - 1))
    .query(
      esb
        .boolQuery()
        .must(esb.termQuery('body.isDeleted', false))
        .should([esb.termsQuery('body.repoId', repoIds), esb.termsQuery('body.id', repoIds)])
        .minimumShouldMatch(1)
    );

  if (searchString) {
    repoLibQuery.query(
      esb.boolQuery().must(esb.wildcardQuery('body.libName', `*${searchString.toLowerCase()}*`))
    );
  }

  const finalRepoLibQuery = repoLibQuery.toJSON();

  const data = await esClientObj.search(Github.Enums.IndexName.GitRepoLibrary, finalRepoLibQuery);

  const repoLibs = await searchedDataFormator(data);
  return repoLibs;
};

const getRepoName = async (
  repoIds: string[],
  counter2: number
): Promise<Github.Type.RepoNameType[]> => {
  const repoNamesQuery = esb
    .requestBodySearch()
    .from(100 * (counter2 - 1))
    .size(100)
    .query(
      esb
        .boolQuery()
        .should([esb.termsQuery('body.repoId', repoIds), esb.termsQuery('body.id', repoIds)])
        .minimumShouldMatch(1)
    )
    .toJSON();
  const repoNamesData = await esClientObj.search(Github.Enums.IndexName.GitRepo, repoNamesQuery);
  const repoNames = await searchedDataFormator(repoNamesData);
  return repoNames;
};
/**
 * Retrieves the upgraded version data for the given repository IDs.
 * @param repoIds An array of repository IDs.
 * @returns A promise that resolves to an array of RepoLibType objects representing the upgraded version data.
 */
async function getESVersionUpgradeData(
  repoIds: string[],
  searchString: string
): Promise<Github.Type.ESVersionUpgradeType> {
  const repoLibData = [];
  let counter = 1;
  let repoLibs;

  do {
    repoLibs = await repoLibsQuery(repoIds, searchString, counter);
    if (repoLibs?.length) {
      repoLibData.push(...repoLibs);
      counter += 1;
    }
  } while (repoLibs?.length);

  const repoNamesArr: Github.Type.RepoNameType[] = [];
  let counter2 = 1;
  let repoNames;
  do {
    repoNames = await getRepoName(repoIds, counter2);
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
  requestId: string,
  sort?: Github.Type.VersionUpgradeSortType
): Promise<Github.Type.VerUpgFinalRes> {
  try {
    // fetching repo-library data from elastic search
    const { updatedRepoLibs, libNames } = await getESVersionUpgradeData(repoIds, search);

    if (!updatedRepoLibs?.length) {
      return { versionData: [], page, totalPages: 0 };
    }

    // fetching records from dynamo db for latest version and release date
    const ddRecords = await fetchDDRecords([...new Set(libNames)], requestId);

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
    logger.error({
      message: 'versionUpgrade.error: Error while fetching version upgrades',
      error: e,
      requestId,
    });
    throw e;
  }
}
