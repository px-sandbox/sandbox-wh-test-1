import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IFtpRateResponse } from 'abstraction/jira/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { getSprints } from 'src/lib/get-sprints';
import { IssueReponse, Sprint } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';

export async function ftpRateGraph(sprintIds: string[]): Promise<IssueReponse[]> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const ftpRateGraphQuery = esb.requestBodySearch().size(0);
    ftpRateGraphQuery.query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.sprintId', sprintIds)])
        .mustNot(esb.termQuery('body.priority', 'HIGH'))
        .should([esb.termQuery('body.isFTP', true), esb.termQuery('body.isFTF', true)])
        .minimumShouldMatch(1)
    );
    ftpRateGraphQuery
      .agg(
        esb
          .termsAggregation('sprint_buckets', 'body.sprintId')
          .agg(esb.filterAggregation('isFTP_true_count', esb.termQuery('body.isFTP', true)))
      )
      .toJSON();

    logger.info('ftpRateGraphQuery', ftpRateGraphQuery);

    const ftpRateGraphResponse: IFtpRateResponse = await esClientObj.queryAggs<IFtpRateResponse>(
      Jira.Enums.IndexName.Issue,
      ftpRateGraphQuery
    );

    const response: IssueReponse[] = [];
    await Promise.all(
      ftpRateGraphResponse.sprint_buckets.buckets.map(async (item) => {
        const sprintData = await getSprints(item.key);
        if (sprintData) {
          response.push({
            totalIssues: item.doc_count,
            ftpRate: item.isFTP_true_count.doc_count,
            ...sprintData,
          });
        }
      })
    );
    return response;
  } catch (e) {
    logger.error('ftpRateGraphQuery.error', e);
    throw e;
  }
}

export async function ftpRateGraphAvg(
  sprintIds: string
): Promise<{ totalIssues: string; ftpRate: string }> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const ftpRateGraphQuery = esb.requestBodySearch().size(0);
    ftpRateGraphQuery.query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.sprintId', sprintIds)])
        .mustNot(esb.termQuery('body.priority', 'HIGH'))
        .should([esb.termQuery('body.isFTP', true), esb.termQuery('body.isFTF', true)])
        .minimumShouldMatch(1)
    );
    ftpRateGraphQuery
      .agg(esb.filterAggregation('isFTP_true_count', esb.termQuery('body.isFTP', true)))
      .toJSON();

    logger.info('AvgftpRateGraphQuery', ftpRateGraphQuery);

    const ftpRateGraphResponse = await esClientObj.getClient().search({
      index: Jira.Enums.IndexName.Issue,
      body: ftpRateGraphQuery,
    });
    return {
      totalIssues: ftpRateGraphResponse.body.hits.total.value,
      ftpRate: ftpRateGraphResponse.body.aggregations.isFTP_true_count.doc_count,
    };
  } catch (e) {
    logger.error('ftpRateGraphQuery.error', e);
    throw e;
  }
}
