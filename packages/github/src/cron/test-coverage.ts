import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { searchedDataFormator } from '../util/response-formatter';
import { v4 as uuid } from 'uuid';

const esClient = ElasticSearchClient.getInstance();

const getCoverageRecords = async (
  RepoIds: string[]
): Promise<Github.Type.TestCoverageResponse[]> => {
  if (RepoIds.length === 0) {
    throw new Error('RepoIds must be provided.');
  }
  const yesterDate = moment().subtract(1, 'days').format('YYYY-MM-DD');
  const query = esb
    .requestBodySearch()
    .size(RepoIds.length)
    .query(esb.termQuery('body.forDate', yesterDate))
    .toJSON();

  const data = await esClient.search(Github.Enums.IndexName.GitTestCoverage, query);
  const records = await searchedDataFormator(data);
  return records;
};

export const fetchSaveTestCoverage = async (RepoIds: string[]): Promise<void> => {
  const dataCoverage = await getCoverageRecords(RepoIds);
  if (!dataCoverage?.length) {
    logger.info({
      message: `fetchSaveTestCoverage.info: GET_GITHUB_BRANCH_DETAILS: No record found for repoIds: ${RepoIds}`,
    });
    return;
  }
  const uniqueID = uuid();
  const currentDate = moment().format('YYYY-MM-DD');
  const updatedDataCoverage = dataCoverage.map(({ _id, ...hit }) => {
    const organizationId = hit.organizationId;
    const repoId = hit.repoId;
    return {
      _id: uniqueID,
      body: {
        ...hit,
        id: `${organizationId}_${repoId}_${currentDate}`,
        forDate: currentDate,
      },
    };
  });
  await esClient.bulkInsert(Github.Enums.IndexName.GitTestCoverage, updatedDataCoverage);
};
