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
import { sortData } from '../util/version-upgrades';

// initializing elastic search client
const esClientObj = ElasticSearchClient.getInstance();
async function getCoreDependencies(
  repoIds: string[],
  searchString: string
): Promise<Github.Type.CoreLib> {
  const query = esb.boolQuery();
  if (searchString) {
    query.must(esb.wildcardQuery('body.libName', `*${searchString.toLowerCase()}*`));
  }
  const coreLibQuery = esb
    .requestBodySearch()
    .size(1000)
    .query(query.must([esb.termsQuery('body.repoId', repoIds), esb.termQuery('body.isCore', true)]))
    .sort(esb.sort('body.isCore', 'asc'));

  const data = await esClientObj.search(
    Github.Enums.IndexName.GitRepoLibrary,
    coreLibQuery.toJSON()
  );
  const coreDep = await searchedDataFormator(data);
  const combinedData = coreDep.reduce((acc: any, item: any) => {
    const key = `${item.libName}-${item.version}`;
    if (!acc[key]) {
      // If the key does not exist in the accumulator, create a new object with all properties of the item except for repoId, which is an array containing item.repoId
      acc[key] = { ...item, repoId: [item.repoId] };
    } else {
      // If the key already exists in the accumulator, just push the new repoId into the existing repoId array
      acc[key].repoId.push(item.repoId);
    }
    return acc;
  }, {});
  const libs: Github.Type.RepoLibType[] = Object.values(combinedData);
  const libNames = libs.map((lib: Github.Type.RepoLibType) => lib.libName);
  return { libs, libNames };
}
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
      logger.error({
        message: 'fetchDDRecords.Error fetching DD record items:',
        error: err,
        requestId,
      });
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
  afterKey: string
): Promise<any> => {
  const query = esb.boolQuery();
  if (searchString) {
    query.must(esb.wildcardQuery('body.libName', `*${searchString.toLowerCase()}*`));
  }
  const compositeAgg = esb
    .compositeAggregation('by_libName')
    .sources(
      esb.CompositeAggregation.termsValuesSource('libName', 'body.libName'),
      esb.CompositeAggregation.termsValuesSource('version', 'body.version')
    );

  if (afterKey) {
    compositeAgg.after(JSON.parse(afterKey));
  }
  const repoLibQuery = esb
    .requestBodySearch()
    .size(0)
    .query(
      query
        .must([esb.termQuery('body.isDeleted', false), esb.termQuery('body.isCore', false)])
        .should([esb.termsQuery('body.repoId', repoIds), esb.termsQuery('body.id', repoIds)])
        .minimumShouldMatch(1)
    )
    .aggs([
      compositeAgg.agg(esb.topHitsAggregation('top_lib_hits').source(true).size(repoIds.length)),
    ]);

  const finalRepoLibQuery = repoLibQuery.toJSON();

  const data = (await esClientObj.search(
    Github.Enums.IndexName.GitRepoLibrary,
    finalRepoLibQuery
  )) as Github.Type.VersionUpgradeAggregation;

  const afterKeyObj = data.aggregations.by_libName.after_key;
  const repoLibData = data.aggregations.by_libName.buckets.map((bucket: any) => {
    const hits = bucket.top_lib_hits.hits.hits;
    return {
      ...hits[0]._source.body,
      libName: bucket.key.libName,
      version: bucket.key.version,
      repoId: hits.map((hit: any) => hit._source.body.repoId),
      releaseDate: hits[0]._source.body.releaseDate,
    };
  });

  return { repoLibData, afterKeyObj };
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
  afterKey: string,
  searchString: string
): Promise<Github.Type.ESVersionUpgradeType> {
  const { repoLibData, afterKeyObj } = await repoLibsQuery(repoIds, afterKey, searchString);
  const repoNamesArr: Github.Type.RepoNameType[] = [];
  let counter = 1;
  let repoNames;
  do {
    repoNames = await getRepoName(repoIds, counter);
    if (repoNames?.length) {
      repoNamesArr.push(...repoNames);
      counter += 1;
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
      repoName: lib.repoId.map((id: string) => {
        return repoNamesObj[id] ?? '';
      }),
      currVerDate: lib.releaseDate,
      currVer: lib.version,
    };
  });
  return { updatedRepoLibs, libNames, afterKeyObj };
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
  repoIds: string[],
  requestId: string,
  afterKey: string,
  sort?: Github.Type.VersionUpgradeSortType
): Promise<Github.Type.VerUpgFinalRes> {
  try {
    let updatedRepoLibs: Github.Type.RepoLibType[] = [];
    let libNames: string[] = [];
    let afterKeyObj: string | undefined;
    let libs: Github.Type.RepoLibType[] = [];
    if (!afterKey) {
      ({ libs, libNames } = await getCoreDependencies(repoIds, search));
    }

    ({ updatedRepoLibs, libNames, afterKeyObj } = await getESVersionUpgradeData(
      repoIds,
      search,
      afterKey
    ));

    if (!updatedRepoLibs?.length) {
      return { versionData: [], afterKey: afterKeyObj ?? '' };
    }
    const ddRecords = await fetchDDRecords([...new Set(libNames)], requestId);
    if (libs?.length) {
      updatedRepoLibs.push(...libs);
    }
    logger.info({ message: 'getVersionUpgrades.info', requestId, data: updatedRepoLibs });
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
    if (!finalData?.length) {
      return { versionData: [], afterKey: afterKeyObj ?? '' };
    }

    const sortedData = await sortData(finalData, sort);

    return { versionData: sortedData, afterKey: afterKeyObj };
  } catch (e) {
    logger.error({
      message: 'getVersionUpgrades.error: Error while fetching version upgrades',
      error: e,
      requestId,
    });
    throw e;
  }
}
