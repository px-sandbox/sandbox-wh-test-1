import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Github, Other } from 'abstraction';
import moment from 'moment';
import { ElasticSearchClient, ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';

const esClient = ElasticSearchClientGh.getInstance();

/**
 * Fetches branches data for the given repository IDs.
 * @param repoIds - An array of repository IDs.
 * @returns A promise that resolves to an array of branch names.
 */
async function fetchBranchesData(repoId: string, currDate: string): Promise<void> {
  // query to extract protected branches with matching repoId
  const query = esb
    .boolQuery()
    .must([
      esb.termQuery('body.repoId', repoId),
      esb.termQuery('body.protected', true),
      esb.termQuery('body.isDeleted', false),
    ])
    .toJSON();

  const branches = await esClient.searchWithEsb(Github.Enums.IndexName.GitBranch, query);

  // formatting data into easily readable form
  const formattedData = await searchedDataFormator(branches);

  if (!formattedData?.length) {
    logger.info(`GET_GITHUB_BRANCH_DETAILS: No branches found for repoId: ${repoId}`);
    return;
  }

  // modifying formatted data into array of branch names.
  const branchesArr: string[] = formattedData.map(
    (data: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody) => data.name
  );

  // sending data to SQS for each branch of each repoId.
  logger.info(
    `GET_GITHUB_BRANCH_DETAILS: sending data to SQS for repoId: ${repoId}, branches: ${branchesArr}`
  );

  const sqsClient = new SQSClient();

  await Promise.all(
    branchesArr.map(async (branch) =>
      sqsClient.sendMessage({ repoId, branch, currDate }, Queue.qGhScansSave.queueUrl)
    )
  );
}

/**
 * Updates the security scans for the given repositories.
 *
 * @param event - The APIGatewayProxyEvent object.
 * @returns A Promise that resolves to an APIGatewayProxyResult object.
 * @throws Error if repoIds are not provided or if an error occurs during the update process.
 */
const updateSecurityScans = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('updateSecurityScans: event: ', event);
  const repoIds = event.queryStringParameters?.repoIds?.split(',') ?? [];
  const currDate = moment().format('YYYY-MM-DD');

  if (!repoIds?.length) {
    throw new Error('RepoIds are not provided!');
  }

  try {
    // we call fetchBranchesData for each repoId in parallel

    await Promise.all(repoIds.map(async (repoId) => fetchBranchesData(repoId, currDate)));
    return responseParser
      .setMessage('successfully updating scans for today')
      .setResponseBodyCode('SUCCESS')
      .setStatusCode(HttpStatusCode['200'])
      .send();
  } catch (e) {
    logger.error(e);
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(updateSecurityScans);
export { handler, updateSecurityScans };
