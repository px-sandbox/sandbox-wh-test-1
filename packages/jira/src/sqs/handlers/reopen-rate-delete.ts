/* eslint-disable max-lines-per-function */
import { Jira } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { getOrganization } from '../../repository/organization/get-organization';
import { mappingPrefixes } from '../../constant/config';
import { getReopenRateDataByIssueId } from '../../repository/issue/get-issue';
import { logProcessToRetry } from 'rp';

const esClientObj = ElasticSearchClient.getInstance();

export const handler = async function reopenInfoQueue(event: SQSEvent): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        message: messageBody,
        reqCtx: { requestId, resourceId },
      } = JSON.parse(record.body);
      try {
        logger.info({
          requestId,
          resourceId,
          message: 'reopenRateDeleteQueue',
          data: { messageBody },
        });
        const reopenRateData = await getReopenRateDataByIssueId(
          messageBody.issue.id,
          messageBody.organization,
          { requestId, resourceId }
        );
        const orgData = await getOrganization(messageBody.organization);

        if (!orgData) {
          logger.error({
            requestId,
            resourceId,
            message: `Organization ${messageBody.organization} not found`,
          });
          throw new Error(`Organization ${messageBody.organization} not found`);
        }

        if (reopenRateData.length > 0) {
          const query = esb
            .requestBodySearch()
            .query(
              esb
                .boolQuery()
                .must([
                  esb.termQuery('body.issueId', `${mappingPrefixes.issue}_${messageBody.issue.id}`),
                  esb.termQuery('body.organizationId', orgData.id),
                ])
            )
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
          logger.info({
            requestId,
            resourceId,
            message: `Delete reopen rate data not found for issueId : ${messageBody.issue.id}`,
          });
        }
        logger.info({ requestId, resourceId, message: 'reopenRateDeleteQueue.success' });
      } catch (error) {
        logger.error({ requestId, resourceId, message: `reopenRateDeleteQueue.error ${error}` });
        await logProcessToRetry(record, Queue.qReOpenRateDelete.queueUrl, error as Error);
      }
    })
  );
};
