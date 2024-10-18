import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { HttpStatusCode, logger, responseParser } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';

const sqsClient = SQSClient.getInstance();
export const handler = async function githubDeployment(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;

  try {
    logger.info({
      message: 'githubDevelopment.handler.received',
      data: event.body,
      requestId,
    });
    const data: Github.ExternalType.Api.githubDeploymentData = JSON.parse(event.body ?? '{}');


    await sqsClient.sendMessage(
      {
        source: data.source, 
        destination: data.destination,
        createAt: data.createAt,
        repoId: data.repoId,
        orgId: data.orgId
      },
      Queue.qGhDeployment.queueUrl,
      { requestId, resourceId: String(data.repoId) }
    );
    return responseParser
      .setBody({})
      .setMessage('Data sent successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (err) {
    return responseParser
      .setMessage(`Failed to get test coverage: ${err}`)
      .setStatusCode(HttpStatusCode['500'])
      .setResponseBodyCode('ERROR')
      .send();
  }
};
