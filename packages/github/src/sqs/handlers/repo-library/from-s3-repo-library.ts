import { SQSClient } from "@pulse/event-handler";
import { Github } from "abstraction";
import { SQSEvent, SQSRecord } from "aws-lambda";
import { logger } from "core";
import { fetchDataFromS3 } from "src/processors/repo-sast-errors";
import { repoLibHelper } from "src/service/repo-library/repo-library-helper";
import { logProcessToRetry } from "src/util/retry-process";
import { Queue } from "sst/node/queue";

export const handler = async function repoLibS3(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);
                const { s3ObjKey } = messageBody;
                const bucketName = `${process.env.SST_STAGE}-version-upgrades`;

                const data: Github.ExternalType.RepoLibrary = await fetchDataFromS3(s3ObjKey, bucketName);

                if (data) {
                    await repoLibHelper(data);
                } else {
                    logger.error('repoLibS3DataReceiver.nodata', { error: 'No data received from s3 for repo library' });
                }
            } catch (error) {
                await logProcessToRetry(record, Queue.qRepoLibS3.queueUrl, error as Error);
                logger.error('repoLibS3DataReceiver.error', error);
            }
        }));
}