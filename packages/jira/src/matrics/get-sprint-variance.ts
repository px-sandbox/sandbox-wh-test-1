import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { IssuesTypes, SprintState } from 'abstraction/jira/enums';
import { BucketItem, SprintVariance, SprintVarianceData } from 'abstraction/jira/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import _ from 'lodash';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../util/response-formatter';

export async function sprintVarianceGraph(
  projectId: string,
  startDate: string,
  endDate: string,
  page: number,
  limit: number,
  sortKey: Jira.Enums.IssueTimeTracker,
  sortOrder: 'asc' | 'desc'
): Promise<SprintVarianceData> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    const sprintQuery = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termQuery('body.projectId', projectId),
            esb.termQuery('body.isDeleted', false),
          ])
          .should([
            esb.rangeQuery('body.startDate').gte(startDate).lte(endDate),
            esb.rangeQuery('body.endDate').gte(startDate).lte(endDate),
          ])
          .minimumShouldMatch(1)
          .should([
            esb.termQuery('body.state', SprintState.ACTIVE),
            esb.termQuery('body.state', SprintState.CLOSED),
          ])
          .minimumShouldMatch(1)
      )
      .toJSON() as { query: object };

    logger.info('sprintQuery', sprintQuery);
    const body = (await esClientObj.searchWithEsb(
      Jira.Enums.IndexName.Sprint,
      sprintQuery.query,
      (page - 1) * limit,
      limit,
      ['body.startDate:desc']
    )) as Other.Type.HitBody;
    const sprintHits = await searchedDataFormator(body);
    console.log('bodysss', sprintHits);
    const issueData: any = {};
    await Promise.all(
      sprintHits.map(async (item: Other.Type.HitBody) => {
        issueData[item.id] = {
          id: item.id,
          name: item.name,
          status: item.state,
          startDate: item.startDate,
          endDate: item.endDate,
        };
      })
    );

    const query = esb
      .requestBodySearch()
      .size(0)
      .agg(
        esb
          .termsAggregation('sprint_aggregation', 'body.sprintId')
          .order(sortKey, sortOrder)
          .size(10)
          .aggs([
            esb.sumAggregation('estimate', 'body.timeTracker.estimate'),
            esb.sumAggregation('actual', 'body.timeTracker.actual'),
          ])
      )
      .query(
        esb
          .boolQuery()
          .must([esb.termsQuery('body.sprintId', Object.keys(issueData))])
          // .filter(esb.rangeQuery('body.timeTracker.estimate').gt(0))
          .should([
            esb.termQuery('body.issueType', IssuesTypes.STORY),
            esb.termQuery('body.issueType', IssuesTypes.TASK),
            esb.termQuery('body.issueType', IssuesTypes.SUBTASK),
            esb.termQuery('body.issueType', IssuesTypes.BUG),
          ])
          .minimumShouldMatch(1)
      )
      .toJSON() as { query: object };
    logger.info('issue_sprint_query', query);
    const ftpRateGraph: { sprint_aggregation: { buckets: BucketItem[] } } =
      await esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
    let sprintEstimate: SprintVariance[] = ftpRateGraph.sprint_aggregation.buckets.map(
      (item: BucketItem): SprintVariance => ({
        sprint: issueData[item.key],
        time: {
          estimate: item.estimate.value,
          actual: item.actual.value,
        },
        variance: parseFloat(
          (item.estimate.value === 0
            ? 0
            : ((item.actual.value - item.estimate.value) * 100) / item.estimate.value
          ).toFixed(2)
        ),
      })
    );

    const totalPages = Math.ceil(body.hits.total.value / limit);

    return {
      data: sprintEstimate,
      totalPages,
      page,
    };
  } catch (e) {
    throw new Error(`Something went wrong: ${e}`);
  }
}

export async function sprintVarianceGraphAvg(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const sprintIdsArr = [];
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const sprintQuery = esb
      .requestBodySearch()
      .source(['body.id'])
      .query(
        esb
          .boolQuery()
          .must([
            esb.termQuery('body.projectId', projectId),
            esb.termQuery('body.isDeleted', false),
          ])
          .should([
            esb.rangeQuery('body.startDate').gte(startDate).lte(endDate),
            esb.rangeQuery('body.endDate').gte(startDate).lte(endDate),
          ])
          .minimumShouldMatch(1)
          .should([
            esb.termQuery('body.state', SprintState.ACTIVE),
            esb.termQuery('body.state', SprintState.CLOSED),
          ])
          .minimumShouldMatch(1)
      )
      .sort(esb.sort('body.sprintId'));
    let sprintIds = [];
    let lastHit;
    do {
      const query = sprintQuery.searchAfter(lastHit);
      const body: Other.Type.HitBody = await esClientObj.esbRequestBodySearch(
        Jira.Enums.IndexName.Sprint,
        query
      );
      lastHit = body.hits.hits[body.hits.hits?.length - 1]?.sort;
      sprintIds = await searchedDataFormator(body);
      sprintIdsArr.push(...sprintIds.map((id) => id.id));
    } while (sprintIds?.length);
    logger.info('sprintIds', { sprintIdsArr });
    const query = esb
      .requestBodySearch()
      .size(0)
      .aggs([
        esb.sumAggregation('estimatedTime', 'body.timeTracker.estimate'),
        esb.sumAggregation('actualTime', 'body.timeTracker.actual'),
      ])
      .query(
        esb
          .boolQuery()
          .must([esb.termsQuery('body.sprintId', sprintIdsArr)])
          .filter(esb.rangeQuery('body.timeTracker.estimate').gt(0))
          .should([
            esb.termQuery('body.issueType', IssuesTypes.STORY),
            esb.termQuery('body.issueType', IssuesTypes.TASK),
            esb.termQuery('body.issueType', IssuesTypes.SUBTASK),
            esb.termQuery('body.issueType', IssuesTypes.BUG),
          ])
          .minimumShouldMatch(1)
      )
      .toJSON() as { query: object };
    logger.info('issue_for_sprints_query', query);
    const ftpRateGraph: { estimatedTime: { value: number }; actualTime: { value: number } } =
      await esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
    return parseFloat(
      (ftpRateGraph.estimatedTime.value === 0
        ? 0
        : ((ftpRateGraph.actualTime.value - ftpRateGraph.estimatedTime.value) * 100) /
          ftpRateGraph.estimatedTime.value
      ).toFixed(2)
    );
  } catch (e) {
    throw new Error(`Something went wrong : ${e}`);
  }
}
