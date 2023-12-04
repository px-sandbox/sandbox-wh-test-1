import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { HttpStatusCode, logger, responseParser } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';

export const handler = async function repoSastScans(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    try {
        const data: Github.ExternalType.Api.RepoSastScans = JSON.parse(event.body ?? '{}');
        const s3 = new S3();
        data.createdAt = moment().toISOString();
        const params = {
            Bucket: process.env.BUCKET_NAME ?? 'sast-error-buckets',
            Key: `${data.orgId}_${data.repoId}_${data.branch.replace(
                /\//g,
                '_'
            )}_${moment().toISOString()}_sast_scan.json`,
            Body: JSON.stringify(data),
            ContentType: 'application/json',
        };
        const s3Obj = await s3.upload(params).promise();
        logger.info('repoSastScans.handler.s3Upload', { s3Obj });
        await new SQSClient().sendMessage(
            {
                repoId: data.repoId,
                branch: data.branch,
                key: s3Obj,
                organizationId: data.orgId,
            },
            Queue.qGhRepoSastError.queueUrl
        );
        logger.info('repoSastScans.handler.received', { data });
        return responseParser
            .setBody({})
            .setMessage('Repo sast scans data received successfully')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (err) {
        logger.error('repoSastScans.handler.error', { err });
        throw err;
    }
};
