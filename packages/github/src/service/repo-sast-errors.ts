import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { HttpStatusCode, logger, responseParser } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';

export const handler = async function repoSastErrors(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    try {
        const data: Github.ExternalType.Api.RepoSastErrors = JSON.parse(event.body ?? '{}');
        const s3 = new S3();
        data.createdAt = moment().toISOString();
        const params = {
            Bucket: `${process.env.SST_STAGE}-sast-errors`,
            Key: `sast_errors_${data.orgId}_${data.repoId}_${data.branch.replace(
                /\//g,
                '_'
            )}_${data.createdAt}.json`,
            Body: JSON.stringify(data),
            ContentType: 'application/json',
        };
        const s3Obj = await s3.upload(params).promise();
        logger.info('repoSastErrors.handler.s3Upload', { s3Obj });
        await new SQSClient().sendMessage(
            {
                repoId: data.repoId,
                branch: data.branch,
                s3Obj,
                orgId: data.orgId,
            },
            Queue.qGhRepoSastError.queueUrl
        );
        logger.info('repoSastErrors.handler.received', { data });
        return responseParser
            .setBody({})
            .setMessage('Repo sast errors data received successfully')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (err) {
        logger.error('repoSastErrors.handler.error', { err });
        throw err;
    }
};
