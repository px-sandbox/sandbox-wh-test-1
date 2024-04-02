import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb, { Script } from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();
const collectData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const orgName = event?.queryStringParameters?.orgName || '';
  try {
    const fileChangeQuery = esb
      .scriptQuery(new Script('source', "doc['body.changes.changes'].size() >= 300"))
      .toJSON();
    const commitData = await esClientObj.search(
      Github.Enums.IndexName.GitCommits,
      fileChangeQuery
    );

    const commits = await searchedDataFormator(commitData);
    logger.info({
      level: 'info',
      message: 'commits_data_length',
      commitLength: commits.length,
    });
    await Promise.all(
      commits.map(async (commit: Github.Type.Commits) => sqsClient.sendMessage(
          { ...commit, repoOwner: orgName },
          Queue.qGhCommitFileChanges.queueUrl
        ))
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
