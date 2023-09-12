import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';

const collectData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const orgName = event?.queryStringParameters?.orgName || '';
  const repoName = event?.queryStringParameters?.repoName || '';
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const repoData = await esClientObj.search(Github.Enums.IndexName.GitRepo, 'name', repoName);
    const [repoId] = await searchedDataFormator(repoData);
    logger.info({ message: 'repoData', repoData: repoId.id, repoName });
    const commitData = await esClientObj.search(
      Github.Enums.IndexName.GitCommits,
      'repoId',
      repoId.id
    );

    const commits = await searchedDataFormator(commitData);
    logger.info({
      level: 'info',
      message: 'commits_data_length',
      commitLength: commits.length,
    });
    await Promise.all(
      commits.map(async (commit: Github.Type.Commits) => {
        new SQSClient().sendMessage(
          { ...commit, repoName, repoOwner: orgName },
          Queue.gh_commit_file_changes.queueUrl
        );
      })
    );
  } catch (error) {
    logger.error(JSON.stringify({ message: 'HISTORY_DATA_ERROR', error }));
  }
  return responseParser
    .setBody('DONE')
    .setMessage('get metadata')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};

const handler = collectData;
export { collectData, handler };
