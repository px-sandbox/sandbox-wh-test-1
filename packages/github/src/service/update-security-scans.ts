import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github, Other } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';

const esClient = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

const fetBranchesData = async (repoId: string, requestId: string): Promise<any> => {
  try {
    const query = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termQuery('body.repoId', repoId),
            esb.termQuery('body.protected', true),
            esb.termQuery('body.isDeleted', false),
          ])
      )
      .toJSON();

    const branches = await esClient.search(Github.Enums.IndexName.GitBranch, query);

    // formatting data into easily readable form
    const formattedData = await searchedDataFormator(branches);
    return formattedData;
  } catch (e) {
    logger.error({
      message: 'fetBranchesData.error: GET_GITHUB_BRANCH_DETAILS',
      error: e,
      requestId,
    });
  }
};
/**
 * Fetches branches data for the given repository IDs.
 * @param repoIds - An array of repository IDs.
 * @returns A promise that resolves to an array of branch names.
 */
async function fetchBranchesData(
  repoId: string,
  currDate: string,
  requestId: string
): Promise<void> {
  // query to extract protected branches with matching repoId
  const formattedData = await fetBranchesData(repoId, requestId);
  if (!formattedData?.length) {
    logger.info({
      message: `fetchBranchesData.info: GET_GITHUB_BRANCH_DETAILS: No branches found for repoId: ${repoId}`,
      requestId,
    });
    return;
  }

  // modifying formatted data into array of branch names.
  const branchesArr: string[] = formattedData.map(
    (data: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody) => data.name
  );

  // sending data to SQS for each branch of each repoId.
  logger.info({
    message: `fetchBranchesData.info:sending data to SQS for repoId: ${repoId}, branches: ${branchesArr}`,
    requestId,
  });

  await Promise.all(
    branchesArr.map(async (branch) =>
      sqsClient.sendMessage({ repoId, branch, currDate }, Queue.qGhScansSave.queueUrl, {
        requestId,
      })
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
  const repoIds = event.queryStringParameters?.repoIds?.split(',') ?? [];
  const currDate = moment().format('YYYY-MM-DD');
  const { requestId } = event.requestContext;
  if (!repoIds?.length) {
    throw new Error('RepoIds are not provided!');
  }

  try {
    // we call fetchBranchesData for each repoId in parallel

    await Promise.all(
      repoIds.map(async (repoId) => fetchBranchesData(repoId, currDate, requestId))
    );
    return responseParser
      .setMessage('successfully updating scans for today')
      .setResponseBodyCode('SUCCESS')
      .setStatusCode(HttpStatusCode['200'])
      .send();
  } catch (e) {
    logger.error({ message: 'updateSecurityScans.error', error: e, requestId });
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(updateSecurityScans);
export { handler, updateSecurityScans };
