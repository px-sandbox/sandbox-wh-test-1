import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { IFtpRateResponse } from 'abstraction/jira/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { getSprints } from '../lib/get-sprints';
import { IssueReponse } from '../util/response-formatter';

export async function reopenRateGraph(sprintIds: string[]): Promise<IssueReponse[]> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const reopenRateGraphQuery = esb.requestBodySearch().size(0);
    reopenRateGraphQuery.query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.sprintId', sprintIds)])
        .mustNot(esb.termQuery('body.issueType', IssuesTypes.BUG))
    );
    reopenRateGraphQuery
      .agg(
        esb
          .termsAggregation('sprint_buckets', 'body.sprintId')
          .agg(esb.filterAggregation('isFTP_true_count', esb.rangeQuery('body.reopenCount').gte(0)))
      )
      .toJSON();

    logger.info('reopenRateGraphQuery', reopenRateGraphQuery);

    const reopenRateGraphResponse: IFtpRateResponse = await esClientObj.queryAggs<IFtpRateResponse>(
      Jira.Enums.IndexName.Issue,
      reopenRateGraphQuery
    );

    const response: IssueReponse[] = [];
    await Promise.all(
      sprintIds.map(async (sprintId) => {
        const sprintData = await getSprints(sprintId);

        const bugsData = reopenRateGraphResponse.sprint_buckets.buckets.find((obj) => obj.key === sprintId);
        if (bugsData) {

          response.push({
            total: bugsData?.doc_count ?? 0,
            totalFtp: bugsData?.isFTP_true_count?.doc_count ?? 0,
            sprint: sprintData.name,
            status: sprintData.state,
            start: sprintData.startDate,
            end: sprintData.endDate,
            percentValue: bugsData?.isFTP_true_count?.doc_count === 0 ? 0 :
              (bugsData.isFTP_true_count.doc_count / bugsData.doc_count) * 100,
          });
        }
      })
      // reopenRateGraphResponse.sprint_buckets.buckets.map(async (item) => {
      //   const sprintData = await getSprints(item.key);
      //   if (sprintData) {
      //     response.push({
      //       totalBugs: item.doc_count ?? 0,
      //       totalReopen: item.isFTP_true_count.doc_count ?? 0,
      //       sprint: sprintData.name,
      //       status: sprintData.state,
      //       start: sprintData.startDate,
      //       end: sprintData.endDate,
      //       percentValue: item.isFTP_true_count.doc_count === 0 ? 0 :
      //         (item.isFTP_true_count.doc_count / item.doc_count) * 100,
      //     });
      //   }
      // })
    );
    return response;
  } catch (e) {
    logger.error('reopenRateGraphQuery.error', e);
    throw e;
  }
}

export async function reopenRateGraphAvg(
  sprintIds: string[]
): Promise<{ totalBugs: string; totalReopen: string, percentValue: number }> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const reopenRateGraphQuery = esb.requestBodySearch().size(0);
    reopenRateGraphQuery.query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.sprintId', sprintIds)])
        .mustNot(esb.termQuery('body.issueType', IssuesTypes.BUG))
    );
    reopenRateGraphQuery
      .agg(esb.filterAggregation('reopenRate', esb.rangeQuery('body.reopenCount').gte(0)))
      .toJSON();

    logger.info('AvgReopenRateGraphQuery', reopenRateGraphQuery);

    const reopenRateGraphResponse = await esClientObj.getClient().search({
      index: Jira.Enums.IndexName.Issue,
      body: reopenRateGraphQuery,
    });
    return {
      totalBugs: reopenRateGraphResponse.body.hits.total.value ?? 0,
      totalReopen: reopenRateGraphResponse.body.aggregations.reopenRate.doc_count ?? 0,
      percentValue: reopenRateGraphResponse.body.aggregations.reopenRate.doc_count === 0 ? 0 :
        (reopenRateGraphResponse.body.aggregations.reopenRate.doc_count /
          reopenRateGraphResponse.body.hits.total.value) * 100,
    };
  } catch (e) {
    logger.error('AvgReopenRateGraphQuery.error', e);
    throw e;
  }
}
