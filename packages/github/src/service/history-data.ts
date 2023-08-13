import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';

const collectData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const historyType = event?.queryStringParameters?.type || '';
  const repo = event?.queryStringParameters?.repo || '';
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    let data = await esClientObj.search(Github.Enums.IndexName.GitRepo, 'name', `${repo}`);
    // let data = (
    //   await esClientObj.getClient().search({
    //     index: Github.Enums.IndexName.GitRepo,
    //   })
    // ).body;
    // const formatedData = await searchedDataFormator(data);
    const [repoData] = await searchedDataFormator(data);
    logger.info({ level: 'info', message: 'github user data', repoData });

    let queueUrl = '';
    if (historyType == 'commits') {
      queueUrl = Queue.gh_historical_branch.queueUrl;
    } else {
      queueUrl = Queue.gh_historical_pr.queueUrl;
    }

    if (repoData) {
      await new SQSClient().sendMessage(repoData, queueUrl);
    }
  } catch (error) {
    logger.error('HISTORY_DATA_ERROR', { error });
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
