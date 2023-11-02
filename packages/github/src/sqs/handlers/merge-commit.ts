import esb from 'elastic-builder';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import { Github } from 'abstraction';
import { searchedDataFormator } from '../../util/response-formatter';
import { mappingPrefixes } from '../../constant/config';
import { logProcessToRetry } from '../../util/retry-process';

const esClient = new ElasticSearchClient({
  host: Config.OPENSEARCH_NODE,
  username: Config.OPENSEARCH_USERNAME ?? '',
  password: Config.OPENSEARCH_PASSWORD ?? '',
});
export const handler = async function processMergeCommit(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('PROCESS_MERGE_COMMIT_SQS_RECIEVER_HANDLER', { messageBody });

        const matchQry = esb
          .matchQuery('body.id', `${mappingPrefixes.commit}_${messageBody.commitId}`)
          .toJSON();
        const searchMergeCommit = await esClient.searchWithEsb(
          Github.Enums.IndexName.GitCommits,
          matchQry
        );

        const [mergeCommitDetail] = await searchedDataFormator(searchMergeCommit);
        if (!mergeCommitDetail) {
          logger.error('processMergeCommit.error', { error: 'mergeCommitDetail not found' });
          await logProcessToRetry(
            record,
            Queue.qGhMergeCommitProcess.queueUrl,
            new Error('mergeCommitDetail not found')
          );
          return false;
        }
        logger.info('MERGE_COMMIT_DETAILS', mergeCommitDetail);
        messageBody.timestamp = mergeCommitDetail.committedAt;

        await new SQSClient().sendMessage(
          messageBody,
          Queue.qGhCommitFormat.queueUrl,
          `${messageBody.commitId}+merge`
        );
      } catch (error) {
        logger.error('processMergeCommit.error', error);
      }
    })
  );
};
