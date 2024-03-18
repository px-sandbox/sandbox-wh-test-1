import { ElasticSearchClient, ElasticSearchClientGh } from '@pulse/elasticsearch';
import { SQSClient, SQSClientGh } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';
import esb from 'elastic-builder';

const esClientObj = ElasticSearchClientGh.getInstance();
const sqsClient = SQSClientGh.getInstance();
const collectData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const historyType = event?.queryStringParameters?.type || '';
  const repo = event?.queryStringParameters?.repo || '';
  const branch = event?.queryStringParameters?.branch || '';
  try {
    const query = esb.matchQuery('body.name', repo).toJSON();
    const data = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitRepo, query);

    const [repoData] = await searchedDataFormator(data);
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
