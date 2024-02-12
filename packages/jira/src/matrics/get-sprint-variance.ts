import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { IssuesTypes, SprintState } from 'abstraction/jira/enums';
import { SprintVariancenData } from 'abstraction/jira/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';

export async function sprintVarianceGraph(
  projectId: string,
  startDate: string,
  endDate: string,
  afterKey: object | undefined,
  sortKey: Jira.Enums.IssueTimeTracker,
  sortOrder: string
): Promise<SprintVariancenData> {
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
    let issueData: any = {};
    await Promise.all(
      body.sprints.buckets.map(async (item: any) => {
        const [sprintHits] = await searchedDataFormator(item.sprint_hits);
        issueData[item.key.sprintId] = {
          id: sprintHits.id,
          name: sprintHits.name,
          startDate: sprintHits.startDate,
          endDate: sprintHits.endDate,
        };
      })
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
    const ftpRateGraph: any = await esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
    const sprintEstimate = ftpRateGraph.sprint_aggregation.buckets.map((item: any) => {
      return {
        sprintId: issueData[item.key],
        time: {
          estimated: item.estimatedTime.value,
          actual: item.actualTime.value,
        },
        variance:
          item.estimatedTime.value === 0
            ? 0
            : ((item.actualTime.value - item.estimatedTime.value) * 100) / item.estimatedTime.value,
      };
    });
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
  let sprintIdsArr = [];
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const sprintQuery = esb
      .requestBodySearch()
      .size(1)
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

    let body: Other.Type.HitBody = await esClientObj.esbRequestBodySearch(
      Jira.Enums.IndexName.Sprint,
      sprintQuery.toJSON()
    );
    let sprintIds = await searchedDataFormator(body);

    sprintIdsArr.push(...sprintIds);
    while (sprintIds?.length) {
      const lastHit = body.hits.hits[body.hits.hits.length - 1];
      const query = sprintQuery.searchAfter([lastHit.sort[0]]).toJSON();
      body = await esClientObj.esbRequestBodySearch(Jira.Enums.IndexName.Sprint, query);
      sprintIds = await searchedDataFormator(body);
      sprintIdsArr.push(...sprintIds);
    }
    const sprintIdsObj = sprintIdsArr.reduce((acc: any, item: any) => {
      acc[item.id] = item;
      return acc;
    }, {});
    logger.info('sprintIdsObj', sprintIdsObj);
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
          .must([esb.termsQuery('body.sprintId', Object.keys(sprintIdsObj))])
          .filter(esb.rangeQuery('body.timeTracker.estimate').gte(0))
          .should([
            esb.termQuery('body.issueType', IssuesTypes.STORY),
            esb.termQuery('body.issueType', IssuesTypes.TASK),
            esb.termQuery('body.issueType', IssuesTypes.SUBTASK),
          ])
          .minimumShouldMatch(1)
      )
      .toJSON() as { query: object };
    const ftpRateGraph: any = await esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
    return ftpRateGraph.estimatedTime.value === 0
      ? 0
      : ((ftpRateGraph.actualTime.value - ftpRateGraph.estimatedTime.value) * 100) /
          ftpRateGraph.estimatedTime.value;
  } catch (e) {
    throw new Error(`Something went wrong : ${e}`);
  }
}
