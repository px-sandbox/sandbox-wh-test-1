import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';

const collectData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const organizationName: string = event?.queryStringParameters?.orgName || '';
  const installationAccessToken = await getInstallationAccessToken();
  const historyType = event?.queryStringParameters?.type || '';
  const octokit = ghRequest.request.defaults({
    headers: {
      authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  try {
    const { query } = esb.requestBodySearch().query(esb.matchAllQuery());
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    let data = (
      await esClientObj.getClient().search({
        index: Github.Enums.IndexName.GitRepo,
        size: 1000,
      })
    ).body;
    const formatedData = await searchedDataFormator(data);
    logger.info({ level: 'info', message: 'github user data', formatedData });
    let queueUrl = '';
    if (historyType == 'commits') {
      queueUrl = Queue.gh_historical_commits.queueUrl;
    } else {
      queueUrl = Queue.gh_historical_pr.queueUrl;
    }

    logger.info(`Total Repositories Processing: ${formatedData.length}`);

    await Promise.all(
      formatedData.map((repoData: any) => new SQSClient().sendMessage(repoData, queueUrl))
    );

    // for (let repoData of formatedData) {
    //   await new SQSClient().sendMessage(repoData, queueUrl);
    // }
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
