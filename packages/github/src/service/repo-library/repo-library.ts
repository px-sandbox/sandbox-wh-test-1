import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { HttpStatusCode, logger, responseParser } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';

const sqsClient = SQSClient.getInstance();
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<void | APIGatewayProxyResult> => {
  const { requestId } = event.requestContext;
  const data: Github.ExternalType.RepoLibrary = JSON.parse(event.body ?? '{}');
  logger.info({ message: 'repoLibrary.handler.received', data, requestId });
  const resourceId = data.repositoryInfo.repoId;
  try {
    const s3 = new S3();
    const createdAt = moment().toISOString();
    const params = {
      Bucket: `${process.env.SST_STAGE}-version-upgrades`,
      Key: `version_upgrade_${data.repositoryInfo.repoOwner}_${data.repositoryInfo.repoId}_${createdAt}.json`,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    };
    const s3Obj = await s3.upload(params).promise();
    logger.info({
      message: 'versionUpgrade.handler.s3Upload',
      data: JSON.stringify(s3Obj),
      requestId,
    });

    // Todo: Remove return statement once the version upgrade is stable
    return responseParser
      .setBody({})
      .setMessage('Version upgrades stopped for now. Will be back soon.')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();

    await sqsClient.sendMessage(
      {
        s3ObjKey: s3Obj.Key,
        repoId: data.repositoryInfo.repoId,
        orgName: data.repositoryInfo.repoOwner,
      },
      Queue.qRepoLibS3.queueUrl,
      { requestId, resourceId }
    );
  } catch (error) {
    logger.error({ message: 'repoLibrary.handler.error', error, requestId, resourceId });
  }
};
