import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { HttpStatusCode, logger, responseParser } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';

const sqsClient = SQSClient.getInstance();

export const handler = async function repoSastErrors(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;
  try {
    logger.info({
      message: 'repoSastErrors.handler.received',
      data: { errorData: event.body },
      requestId,
    });
    const data: Github.ExternalType.Api.RepoSastErrors = JSON.parse(event.body ?? '{}');

    const s3 = new S3();
    data.createdAt = data.createdAt || moment().toISOString();
    const params = {
      Bucket: `${process.env.SST_STAGE}-sast-errors`,
      Key: `sast_errors_${data.orgId}_${data.repoId}_${data.branch.replace(/\//g, '_')}_${
        data.createdAt
      }.json`,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    };
    const s3Obj = await s3.upload(params).promise();
    logger.info({ message: 'repoSastErrors.handler.s3Upload', data: { s3Obj }, requestId });

    await sqsClient.sendMessage(
      {
        repoId: data.repoId,
        branch: data.branch,
        s3Obj,
        orgId: data.orgId,
        createdAt: data.createdAt,
      },
      Queue.qGhRepoSastError.queueUrl,
      { requestId }
    );
    logger.info({ message: 'repoSastErrors.handler.received', data, requestId });
    return responseParser
      .setBody({})
      .setMessage('Repo sast errors data received successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (err) {
    logger.error({ message: 'repoSastErrors.handler.error', error: err, requestId });
    return responseParser
      .setMessage(`Failed to get SAST errors: ${err}`)
      .setStatusCode(HttpStatusCode['500'])
      .setResponseBodyCode('ERROR')
      .send();
  }
};
