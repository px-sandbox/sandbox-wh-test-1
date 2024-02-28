import { Jira } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { getReopenRateDataByIssueId } from '../../repository/issue/get-issue';
// import { saveReOpenRate } from '../../repository/issue/save-reopen-rate';
import { logProcessToRetry } from '../../util/retry-process';

const esClientObj = new ElasticSearchClient({
  host: Config.OPENSEARCH_NODE,
  username: Config.OPENSEARCH_USERNAME ?? '',
  password: Config.OPENSEARCH_PASSWORD ?? '',
});
export const handler = async function reopenInfoQueue(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('reopenRateDeleteQueue', { messageBody });
        const reopenRateData = await getReopenRateDataByIssueId(
          messageBody.issue.id,
          messageBody.organization
        );

        if (reopenRateData.length > 0) {
          const query = esb
            .boolQuery()
            .must([
              esb.termQuery('body.id', messageBody.issue.id),
              esb.termQuery('body.organizationId', messageBody.organization),
            ])
            .toJSON();

          const script = esb
            .script()
            .source(`ctx._source.body.isDeleted=true;ctx._source.body.deletedAt=params.deletedAt`)
            .params({
              deletedAt: moment(messageBody.eventTime).toISOString(),
            });

          await esClientObj.updateByQuery(Jira.Enums.IndexName.ReopenRate, query, script);
          //   await Promise.all(
          //     reopenRateData.map(
          //       async (issueData: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody) => {
          //         // issueData.isDeleted = true;
          //         // issueData.deletedAt = moment(messageBody.eventTime).toISOString();
          //         // const { _id, ...reopenData } = issueData;
          //         // await saveReOpenRate({ id: _id, body: reopenData } as Jira.Type.Issue);
          //       }
          //     )
          //   );
        } else {
          logger.info(`Delete reopen rate data not found for issueId : ${messageBody.issue.id}`);
        }
        logger.info('reopenRateDeleteQueue.success');
      } catch (error) {
        logger.error(`reopenRateDeleteQueue.error ${error}`);
        await logProcessToRetry(record, Queue.qReOpenRateDelete.queueUrl, error as Error);
      }
    })
  );
};
