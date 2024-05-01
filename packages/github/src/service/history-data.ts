import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();
const getRepo = async (repo: string): Promise<any> => {
  const query = esb.requestBodySearch().query(esb.matchQuery('body.name', repo)).toJSON();
  const data = await esClientObj.search(Github.Enums.IndexName.GitRepo, query);
  const [repoData] = await searchedDataFormator(data);
  return repoData;
}
const collectData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const historyType = event?.queryStringParameters?.type || '';
  const repo = event?.queryStringParameters?.repo || '';
  const branch = event?.queryStringParameters?.branch || '';
  try {
    const repoData = await getRepo(repo);
    logger.info({ level: 'info', message: 'github repo data', repoData });

    let queueUrl = '';
    if (historyType === 'commits') {
      repoData.reqBranch = branch;
      queueUrl = Queue.qGhHistoricalBranch.queueUrl;
    } else {
      queueUrl = Queue.qGhHistoricalPr.queueUrl;
    }

    if (repoData) {
      await sqsClient.sendMessage(repoData, queueUrl);
    }
  } catch (error) {
    logger.error(`HISTORY_DATA_ERROR:, ${error}`);
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
