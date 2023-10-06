import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { IFtpRateResponse } from 'abstraction/jira/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { getSprints } from 'src/lib/get-sprints';
import { IssueReponse, Sprint } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';

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
          .agg(esb.filterAggregation('reopen-rate', esb.rangeQuery('body.reopenCount').gte(0)))
      )
      .toJSON();

    logger.info('reopenRateGraphQuery', reopenRateGraphQuery);

    const reopenRateGraphResponse: IFtpRateResponse = await esClientObj.queryAggs<IFtpRateResponse>(
      Jira.Enums.IndexName.Issue,
      reopenRateGraphQuery
    );

    const response: IssueReponse[] = [];
    await Promise.all(
      reopenRateGraphResponse.sprint_buckets.buckets.map(async (item) => {
        const sprintData = await getSprints(item.key);
        if (sprintData) {
          response.push({
            totalDoc: item.doc_count,
            reopenRate: item.isFTP_true_count.doc_count,
            ...sprintData,
          });
        }
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
): Promise<{ totalDocs: string; reopenRate: string }> {
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
      totalDocs: reopenRateGraphResponse.body.hits.total.value,
      reopenRate: reopenRateGraphResponse.body.aggregations.reopenRate.doc_count,
    };
  } catch (e) {
    logger.error('AvgReopenRateGraphQuery.error', e);
    throw e;
  }
}
