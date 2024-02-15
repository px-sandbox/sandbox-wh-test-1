import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { IssuesTypes, SprintState } from 'abstraction/jira/enums';
import { BucketItem, SprintVariance, SprintVarianceData } from 'abstraction/jira/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { Config } from 'sst/node/config';

export async function sprintVarianceGraph(
  projectId: string,
  startDate: string,
  endDate: string,
  afterKey: object | undefined,
  sortKey: Jira.Enums.IssueTimeTracker,
  sortOrder: string
): Promise<SprintVarianceData> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    let compositeAgg = esb
      .compositeAggregation('sprints')
      .agg(esb.topHitsAggregation('sprint_hits').size(10))
      .sources(esb.CompositeAggregation.termsValuesSource('sprintId', 'body.id'));

    if (afterKey) {
      compositeAgg = compositeAgg.after(afterKey);
    }
    const sprintQuery = esb
      .requestBodySearch()
      .size(0)
      .agg(compositeAgg)

      .query(
        esb
          .boolQuery()
          .must([
            esb.termQuery('body.projectId', projectId),
            esb.rangeQuery('body.startDate').gte(startDate).lte(endDate),
            esb.termQuery('body.isDeleted', false),
          ])
          .should([
            esb.termQuery('body.state', SprintState.ACTIVE),
            esb.termQuery('body.state', SprintState.CLOSED),
          ])
          .minimumShouldMatch(1)
      )
      .toJSON() as { query: object };

    logger.info('sprintQuery', sprintQuery);
    const body: { sprints: { buckets: []; after_key: string } } = await esClientObj.queryAggs(
      Jira.Enums.IndexName.Sprint,
      sprintQuery
    );
    const issueData: Record<
      string,
      { id: string; name: string; status: string; startDate: string; endDate: string }
    > = {};
    await Promise.all(
      body.sprints.buckets.map(
        async (item: { sprint_hits: esb.CompositeAggregation; key: { sprintId: string } }) => {
          const [sprintHits] = await searchedDataFormator(item.sprint_hits);
          issueData[item.key.sprintId] = {
            id: sprintHits.id,
            name: sprintHits.name,
            status: sprintHits.state,
            startDate: sprintHits.startDate,
            endDate: sprintHits.endDate,
          };
        }
      )
    );
    const afterKeyData = body.sprints.after_key;
    const query = esb
      .requestBodySearch()
      .size(0)
      .agg(
        esb
          .termsAggregation('sprint_aggregation', 'body.sprintId')
          .size(10)
          .aggs([
            esb.sumAggregation('estimatedTime', 'body.timeTracker.estimate'),
            esb.sumAggregation('actualTime', 'body.timeTracker.actual'),
          ])
      )
      .query(
        esb
          .boolQuery()
          .must([esb.termsQuery('body.sprintId', Object.keys(issueData))])
          .filter(esb.rangeQuery('body.timeTracker.estimate').gte(0))
          .should([
            esb.termQuery('body.issueType', IssuesTypes.STORY),
            esb.termQuery('body.issueType', IssuesTypes.TASK),
            esb.termQuery('body.issueType', IssuesTypes.SUBTASK),
          ])
          .minimumShouldMatch(1)
      )
      .sort(esb.sort(`${Jira.Enums.IssueTimeTrackerSort[sortKey]}`, sortOrder))
      .toJSON() as { query: object };
    logger.info('issue_sprint_query', query);
    const ftpRateGraph: { sprint_aggregation: { buckets: BucketItem[] } } =
      await esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
    const sprintEstimate: SprintVariance[] = ftpRateGraph.sprint_aggregation.buckets.map(
      (item: BucketItem): SprintVariance => ({
        sprint: issueData[item.key],
        time: {
          estimate: item.estimatedTime.value,
          actual: item.actualTime.value,
        },
        variance: parseFloat(
          (item.estimatedTime.value === 0
            ? 0
            : ((item.actualTime.value - item.estimatedTime.value) * 100) / item.estimatedTime.value
          ).toFixed(2)
        ),
      })
    );
    return {
      data: sprintEstimate,
      afterKey: afterKeyData
        ? Buffer.from(JSON.stringify(afterKeyData), 'utf-8').toString('base64')
        : '',
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
            esb.rangeQuery('body.startDate').gte(startDate).lte(endDate),
            esb.termQuery('body.isDeleted', false),
          ])
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
          .filter(esb.rangeQuery('body.timeTracker.estimate').gte(0))
          .should([
            esb.termQuery('body.issueType', IssuesTypes.STORY),
            esb.termQuery('body.issueType', IssuesTypes.TASK),
            esb.termQuery('body.issueType', IssuesTypes.SUBTASK),
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
