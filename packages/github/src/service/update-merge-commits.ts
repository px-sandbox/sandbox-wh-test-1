import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';

const esObj = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();
const getRepoData = async (repoId: string, requestId:string): Promise<any> => {
  const query = esb.requestBodySearch().query(esb.matchQuery('body.id', repoId)).toJSON();
  const repoData = await esObj.search(Github.Enums.IndexName.GitRepo, query);
  const [repo] = await searchedDataFormator(repoData);
  logger.info({ message: 'repo name -->', data: { repoName: repo.name }, requestId});
  return repo;
}
const getCommits = async (repoId: string): Promise<any> => {
    const query = esb
      .requestBodySearch()
      .size(10000)
      .query(esb.boolQuery().must(esb.termsQuery('body.repoId', repoId)));

    const searchInEsb = await esObj.paginateSearch(
      Github.Enums.IndexName.GitCommits,
      query.toJSON()
    );
    const commitData = await searchedDataFormator(searchInEsb);
    return commitData;
  } 


const updateMergeCommit = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId: string = event.requestContext.requestId;
  const repoId: string = event.queryStringParameters?.repoId || '';
  const repoOwner: string = event.queryStringParameters?.repoOwner || '';
  try {
    const repo = await getRepoData(repoId,requestId);
    if (repo) {
      const commitData = await getCommits(repo.id);
      if (commitData.length > 0) {
        await Promise.all(
          commitData.map(async (commit: Github.Type.Commits) => sqsClient.sendMessage(
              { ...commit, repoName: repo.name, repoOwner },
            Queue.qUpdateMergeCommit.queueUrl,
            {requestId, resourceId: commit.body.githubCommitId} 
            ))
        );

        return responseParser
          .setBody('DONE')
          .setMessage('updating merge commits')
          .setStatusCode(HttpStatusCode[200])
          .setResponseBodyCode('SUCCESS')
          .send();
      }
    }
  
    return responseParser
      .setBody('DONE')
      .setMessage('No repo found')
      .setStatusCode(HttpStatusCode[400])
      .setResponseBodyCode('Failed')
      .send();
  } catch (err) {
    logger.error({ message: 'error in fetching github repo data', error: err, requestId});
    throw err;
  }
};

const handler = updateMergeCommit;
export { handler, updateMergeCommit };
