import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { IReopenRateResponse } from 'abstraction/jira/type';
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
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
          esb.termQuery('body.isDeleted', false),
        ])
    );
    reopenRateGraphQuery
      .agg(
        esb
          .termsAggregation('sprint_buckets', 'body.sprintId')
          .size(sprintIds.length)
          .agg(esb.filterAggregation('reopen_count', esb.rangeQuery('body.reOpenCount').gt(0)))
      )
      .toJSON();

    logger.info('reopenRateGraphQuery', reopenRateGraphQuery);

    const reopenRateGraphResponse: IReopenRateResponse = await esClientObj.queryAggs<IReopenRateResponse>(
      Jira.Enums.IndexName.Issue,
      reopenRateGraphQuery
    );

    const response: IssueReponse[] = await Promise.all(
      sprintIds.map(async (sprintId) => {
        const sprintData = await getSprints(sprintId);

        const bugsData = reopenRateGraphResponse.sprint_buckets.buckets.find(
          (obj) => obj.key === sprintId
        );

        const totalBugs = bugsData?.doc_count ?? 0;
        const totalReopen = bugsData?.reopen_count?.doc_count ?? 0;
        const percentValue = totalBugs === 0 ? 0 : (totalReopen / totalBugs) * 100;

        return {
          totalBugs,
          totalReopen,
          sprintName: sprintData.name,
          status: sprintData.state,
          startDate: sprintData.startDate,
          endDate: sprintData.endDate,
          percentValue: Number.isNaN(percentValue) ? 0 : Number(percentValue.toFixed(2)),
        };
      })
    );

    return response;
  } catch (e) {
    logger.error('reopenRateGraphQuery.error', e);
    throw e;
  }
}

export async function reopenRateGraphAvg(
  sprintIds: string[]
): Promise<{ totalBugs: string; totalReopen: string; percentValue: number }> {
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
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
          esb.termQuery('body.isDeleted', false),
        ])
    );
    reopenRateGraphQuery
      .agg(esb.filterAggregation('reopenRate', esb.rangeQuery('body.reOpenCount').gt(0)))
      .toJSON();

    logger.info('AvgReopenRateGraphQuery', reopenRateGraphQuery);

    const reopenRateGraphResponse = await esClientObj.getClient().search({
      index: Jira.Enums.IndexName.Issue,
      body: reopenRateGraphQuery,
    });
    return {
      totalBugs: reopenRateGraphResponse.body.hits.total.value ?? 0,
      totalReopen: reopenRateGraphResponse.body.aggregations.reopenRate.doc_count ?? 0,
      percentValue:
        reopenRateGraphResponse.body.aggregations.reopenRate.doc_count === 0
          ? 0
          : Number(
            (
              (reopenRateGraphResponse.body.aggregations.reopenRate.doc_count /
                reopenRateGraphResponse.body.hits.total.value) *
              100
            ).toFixed(2)
          ),
    };
  } catch (e) {
    logger.error('AvgReopenRateGraphQuery.error', e);
    throw e;
  }
}
