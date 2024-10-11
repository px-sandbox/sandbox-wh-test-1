import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { searchedDataFormator } from '../util/response-formatter';
import { v4 as uuidv4 } from 'uuid';

const esClient = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

const getCoverageRecords = async (
    RepoIds: string[]
  ): Promise<Github.Type.TestCoverageResponse[]> => {
    RepoIds[0]="gh_repo_660498616";
    const yesterDate = moment().subtract(1, 'days').format('YYYY-MM-DD');
    const query = esb
      .requestBodySearch()
      .size(RepoIds.length)
      .query(
        esb.termQuery('body.forDate',yesterDate),
      )
      .toJSON();

    const data = await esClient.search(Github.Enums.IndexName.GitTestCoverage, query);
    const records=await searchedDataFormator(data);
    return records;
  };


export const fetchSaveTestCoverage = async (RepoIds: string[]): Promise<void> => {
    const dataCoverage = await getCoverageRecords(RepoIds);
    if (!dataCoverage?.length) {
      logger.info({
        message: `fetchSaveTestCoverage.info: GET_GITHUB_BRANCH_DETAILS: No record found for repoIds: ${RepoIds}`
      });
      return;
    }
    const uniqueID = uuidv4();
    const currentDate = moment().format('YYYY-MM-DD'); 
    const updatedDataCoverage = dataCoverage.map(({_id,...hit}) => {
    const organizationId = hit.organizationId;
    const repoId=hit.repoId;
        return {
          _id:uniqueID,
            body: {
              ...hit,
              id: `${organizationId}_${repoId}_${currentDate}`, 
              forDate: currentDate
            }
        };
    });
    await esClient.bulkInsert(Github.Enums.IndexName.GitTestCoverage,updatedDataCoverage);
  };

  