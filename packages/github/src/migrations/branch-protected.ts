/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { getBranches } from '../lib/get-branch-list';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
const getReposFromES = async (requestId: string): Promise<any> => {
  let reposFormatData;
  try {
    const reposData = [];
    const size = 100;
    let from = 0;

    do {
      reposFormatData = [];
      const query = esb
        .requestBodySearch()
        .size(size)
        .query(esb.matchAllQuery())
        .from(from)
        .toJSON() as { query: object };

      const esReposData = await esClientObj.paginateSearch(Github.Enums.IndexName.GitRepo, query);

      reposFormatData = await searchedDataFormator(esReposData);
      reposData.push(...reposFormatData);
      from += size;

      const getBranchesPromises = reposData.map((repoData) =>
        getBranches(repoData.githubRepoId, repoData.name, repoData.owner, {
          requestId,
          resourceId: repoData.name,
        })
      );
      await Promise.all(getBranchesPromises);
    } while (reposFormatData.length === size);

    return reposData;
  } catch (error) {
    logger.error({ message: 'getReposFromES.error', error });
    throw error;
  }
};

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;
  const repos = await getReposFromES(requestId);
  return responseParser
    .setBody({ headline: repos })
    .setMessage('Headline for update protected keyword in branch data')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
}
