import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IFtpRateResponse } from 'abstraction/jira/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { IssueReponse } from '../util/response-formatter';
import { getSprints } from '../lib/get-sprints';

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
            total: item.doc_count,
            totalFtp: item.isFTP_true_count.doc_count,
            sprint: sprintData.name,
            status: sprintData.state,
            start: sprintData.startDate,
            end: sprintData.endDate,
            percentValue:
              item.isFTP_true_count.doc_count === 0 ? 0 : (item.isFTP_true_count.doc_count / item.doc_count) * 100,
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
  sprintIds: string[]
): Promise<{ total: string; totalFtp: string, percentValue: number }> {
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
      total: ftpRateGraphResponse.body.hits.total.value,
      totalFtp: ftpRateGraphResponse.body.aggregations.isFTP_true_count.doc_count,
      percentValue: ftpRateGraphResponse.body.aggregations.isFTP_true_count.doc_count === 0 ? 0 :
        (ftpRateGraphResponse.body.aggregations.isFTP_true_count.doc_count /
          ftpRateGraphResponse.body.hits.total.value) * 100,
    };
  } catch (e) {
    logger.error('ftpRateGraphQuery.error', e);
    throw e;
  }
}
