import { Jira } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { getOrganization } from '../../repository/organization/get-organization';
import { mappingPrefixes } from '../../constant/config';
import { getReopenRateDataByIssueId } from '../../repository/issue/get-issue';
import { logProcessToRetry } from '../../util/retry-process';

const esClientObj = ElasticSearchClient.getInstance();

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
        const orgData = await getOrganization(messageBody.organization);

        if (!orgData) {
          logger.error(`Organization ${messageBody.organization} not found`);
          throw new Error(`Organization ${messageBody.organization} not found`);
        }

        if (reopenRateData.length > 0) {
          const query = esb
            .requestBodySearch()
            .query(esb
            .boolQuery()
            .must([
              esb.termQuery('body.issueId', `${mappingPrefixes.issue}_${messageBody.issue.id}`),
              esb.termQuery('body.organizationId', `${orgData.id}`),
            ]))
            .toJSON();

          const script = esb
            .script()
            .source(
              'ctx._source.body.isDeleted=params.isDeleted;ctx._source.body.deletedAt=params.deletedAt'
            )
            .params({
              deletedAt: moment(messageBody.eventTime).toISOString(),
              isDeleted: true,
            })
            .toJSON();

          await esClientObj.updateByQuery(Jira.Enums.IndexName.ReopenRate, query, script);
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
