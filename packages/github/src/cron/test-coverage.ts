import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { searchedDataFormator } from '../util/response-formatter';
import { v4 as uuid } from 'uuid';

const esClient = ElasticSearchClient.getInstance();

const getYesterdayCoverageData = async (
  RepoIds: string[]
): Promise<Github.Type.TestCoverageResponse[]> => {
  const yesterDate = moment().subtract(1, 'days').format('YYYY-MM-DD');
  try{
  const query = esb
    .requestBodySearch()
    .size(RepoIds.length)
    .query(
      esb
        .boolQuery()
        .must([esb.termQuery('body.forDate', yesterDate), esb.termsQuery('body.repoId', RepoIds)])
    )
    .toJSON();

  const data = await esClient.search(Github.Enums.IndexName.GitTestCoverage, query);
  const records = await searchedDataFormator(data);
  return records;
  }catch (error) {
    logger.error({
      message: `getYesterdayCoverageRecords.error: Failed to get coverage records for RepoIds: ${RepoIds}`,
      error: `${error}`
    });
    throw error;
  }
};

const getCoverageData = async (RepoIds: string[],currentDate:string): Promise<Github.Type.TestCoverageResponse[]> => {
  
  let coverage:Github.Type.TestCoverageResponse[] = [];
  try{
  const query = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([esb.termQuery('body.forDate', currentDate), esb.termsQuery('body.repoId', RepoIds)])
    )
    .toJSON();
  const data = await esClient.search(Github.Enums.IndexName.GitTestCoverage, query);
  const formatted = await searchedDataFormator(data);
  const matchedRepoIds = formatted.map((hit: any) => hit.repoId);
  const filteredRepoIds = RepoIds.filter((repo) => !matchedRepoIds.includes(repo));
  if (filteredRepoIds.length >0) {
    coverage  = await getYesterdayCoverageData(filteredRepoIds);
  }
  return coverage;
}catch (error) {
  logger.error({
    message: `getCoverageData.error: Failed to get coverage for current date for RepoIds: ${RepoIds}`,
    error: `${error}`,
  });
  throw error;
}
};

export const fetchSaveTestCoverage = async (RepoIds: string[],currentDate:string): Promise<void> => {
  try{
  const dataCoverage = await getCoverageData(RepoIds,currentDate);
  if (!dataCoverage?.length) {
    logger.info({
      message: `fetchSaveTestCoverage.info: GET_GITHUB_BRANCH_DETAILS: No record found for repoIds: ${RepoIds}`,
    });
    return;
  }
 
  const updatedDataCoverage = dataCoverage.map(({ _id, ...hit }) => {
    const organizationId = hit.organizationId;
    const repoId = hit.repoId;
    return {
      _id: uuid(),
      body: {
        ...hit,
        id: `${organizationId}_${repoId}_${currentDate}`,
        forDate: currentDate,
        cron:true,
      },
    };
  });
  await esClient.bulkInsert(Github.Enums.IndexName.GitTestCoverage, updatedDataCoverage);
  }catch (error) {
    logger.error({
      message: `fetchSaveTestCoverage.error: Failed to fetch and save test coverage for repoIds: ${RepoIds}`,
      error: `${error}`
    });
  }
};
