import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClient = ElasticSearchClient.getInstance();

/**
 * Fetches branches data for the given repository IDs.
 * @param repoIds - An array of repository IDs.
 * @returns A promise that resolves to an array of branch names.
 */
async function fetchBranchesData(repoIds: string[]): Promise<string[]> {
  const query = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.repoId', repoIds), esb.termQuery('body.protected', true)])
    )
    .toJSON();

  logger.info({ message: 'GET_GITHUB_BRANCH_DETAILS: will now fetch data from ES' });
  const branches = await esClient.search(Github.Enums.IndexName.GitBranch, query);

  const formattedData = await searchedDataFormator(branches);

  if (!formattedData.length) {
    logger.info({
      message: 'GET_GITHUB_BRANCH_DETAILS: No branches data found in ES for given repoIds',
    });
    return [];
  }

  const branchesArr: string[] = formattedData.map(
    (data: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody) => data.name
  );
  logger.info({
    message: 'GET_GITHUB_BRANCH_DETAILS: branches data found in ES for given repoIds',
    data: {
      branchesArr,
    },
  });

  return [...new Set(branchesArr)];
}
/**
 * Retrieves branch data for the given repositories.
 *
 * @param event - The APIGatewayProxyEvent object.
 * @returns A Promise that resolves to an APIGatewayProxyResult object.
 * @throws Error if repoIds are not provided.
 */
const gitBranches = async function getBranchesData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  logger.info({ message: 'GET_GITHUB_BRANCH_DETAILS', data: event });

  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') ?? [];
  if (repoIds.length <= 0) {
    logger.error({ message: 'repoIds is empty but they are required', data: repoIds });
    throw new Error('RepoIds are required');
  }

  try {
    const body = await fetchBranchesData(repoIds);

    // we are not throwing error when no branches found for given repoIds because API shouldn't fail in that case
    return responseParser
      .setBody(body)
      .setMessage('Branches fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error({ message: 'GET_GITHUB_BRANCH_DETAILS', error });
    throw error;
  }
};
const handler = APIHandler(gitBranches);

export { gitBranches, handler };
