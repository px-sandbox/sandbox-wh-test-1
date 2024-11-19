import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { Queue } from 'sst/node/queue';

const sqsClient = SQSClient.getInstance();
export const handler = async function githubDeploymentFrequency(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;

  try {
    logger.info({
      message: 'githubDeploymentFrequency.handler.received',
      data: JSON.stringify(event.body),
      requestId,
    });
    const data: Github.ExternalType.Api.githubDeploymentFrequencyData = JSON.parse(
      event.body ?? '{}'
    );

    await sqsClient.sendMessage(data, Queue.qGhDeploymentFrequency.queueUrl, {
      requestId,
      resourceId: String(data.repository),
    });
    return responseParser
      .setBody({})
      .setMessage('Data sent successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (err) {
    return responseParser
      .setMessage(`githubDeploymentFrequency.handler.error : ${err}`)
      .setStatusCode(HttpStatusCode['500'])
      .setResponseBodyCode('ERROR')
      .send();
  }
};
