import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IFtpRateResponse } from 'abstraction/jira/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { getBoardByOrgId } from '../repository/board/get-board';
import { getSprints } from '../lib/get-sprints';
import { IssueReponse } from '../util/response-formatter';

// eslint-disable-next-line max-lines-per-function,
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
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery('body.issueType', [
            Jira.Enums.IssuesTypes.TASK,
            Jira.Enums.IssuesTypes.STORY,
          ]),
        ])
        .should([esb.termQuery('body.isFTP', true), esb.termQuery('body.isFTF', true)])
        .minimumShouldMatch(1)
    );
    ftpRateGraphQuery
      .agg(
        esb
          .termsAggregation('sprint_buckets', 'body.sprintId')
          .size(sprintIds.length)
          .agg(esb.filterAggregation('isFTP_true_count', esb.termQuery('body.isFTP', true)))
      )
      .toJSON();

    logger.info('ftpRateGraphQuery', ftpRateGraphQuery);

    const ftpRateGraphResponse: IFtpRateResponse = await esClientObj.queryAggs<IFtpRateResponse>(
      Jira.Enums.IndexName.Issue,
      ftpRateGraphQuery
    );

    const response: IssueReponse[] = await Promise.all(
      sprintIds.map(async (sprintId) => {
        const sprintData = await getSprints(sprintId);
        const boardName = await getBoardByOrgId(sprintData.originBoardId, sprintData.organizationId)

        const ftpData = ftpRateGraphResponse.sprint_buckets.buckets.find(
          (obj) => obj.key === sprintId
        );

        const total = ftpData?.doc_count ?? 0;
        const totalFtp = ftpData?.isFTP_true_count?.doc_count ?? 0;
        const percentValue = totalFtp === 0 || total === 0 ? 0 : (totalFtp / total) * 100;

        return {
          total,
          totalFtp,
          sprintName: sprintData.name,
          boardName: boardName.name,
          status: sprintData.state,
          startDate: sprintData.startDate,
          endDate: sprintData.endDate,
          percentValue: Number.isNaN(percentValue) ? 0 : Number(percentValue.toFixed(2)),
        };
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
): Promise<{ total: string; totalFtp: string; percentValue: number }> {
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
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery('body.issueType', [
            Jira.Enums.IssuesTypes.TASK,
            Jira.Enums.IssuesTypes.STORY,
          ]),
        ])
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
      total: ftpRateGraphResponse.body.hits.total.value ?? 0,
      totalFtp: ftpRateGraphResponse.body.aggregations.isFTP_true_count.doc_count ?? 0,
      percentValue:
        ftpRateGraphResponse.body.aggregations.isFTP_true_count.doc_count === 0
          ? 0
          : Number(
            (
              (ftpRateGraphResponse.body.aggregations.isFTP_true_count.doc_count /
                ftpRateGraphResponse.body.hits.total.value) *
              100
            ).toFixed(2)
          ),
    };
  } catch (e) {
    logger.error('ftpRateGraphQuery.error', e);
    throw e;
  }
}
