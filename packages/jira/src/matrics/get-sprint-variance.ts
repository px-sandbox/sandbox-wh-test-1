import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { IssuesTypes, SprintState } from 'abstraction/jira/enums';
import { BucketItem, SprintVariance, SprintVarianceData } from 'abstraction/jira/type';
import { logger } from 'core';
import esb, { Script } from 'elastic-builder';
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
  sortOrder: 'asc' | 'desc',
  afterKey?: object | undefined
): Promise<SprintVarianceData> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    let sprintData: any = [];
    let sprintIds: any = [];
    let sprintHits: any = [];
    let size = 100;
    let from = 0;

    const sprintQuery = esb
      .requestBodySearch()
      .query(
        esb.boolQuery().must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.isDeleted', false),
          esb
            .boolQuery()
            .should([
              esb.rangeQuery('body.startDate').gte(startDate).lte(endDate),
              esb.rangeQuery('body.endDate').gte(startDate).lte(endDate),
            ])
            .minimumShouldMatch(1),
          esb
            .boolQuery()
            .should([
              esb.termQuery('body.state', SprintState.ACTIVE),
              esb.termQuery('body.state', SprintState.CLOSED),
            ])
            .minimumShouldMatch(1),
        ])
      )
      .toJSON() as { query: object };

    logger.info('sprintQuery', sprintQuery);
    const sumActualScript = new Script().inline(
      "return params._source.body.timeTracker.estimate == 0 ? 0 : doc['body.timeTracker.actual'].value"
    );
    do {
      const body = (await esClientObj.searchWithEsb(
        Jira.Enums.IndexName.Sprint,
        sprintQuery.query,
        from,
        size,
        ['body.startDate:desc']
      )) as Other.Type.HitBody;
      sprintHits = await searchedDataFormator(body);
      await Promise.all(
        sprintHits.map(async (item: Other.Type.HitBody) => {
          sprintData.push({
            id: item.id,
            name: item.name,
            status: item.state,
            startDate: item.startDate,
            endDate: item.endDate,
          });
          sprintIds.push(item.id);
        })
      );
      from += size;
    } while (sprintData.length == limit);
    let compositeAgg = esb
      .compositeAggregation('sprint_aggregation')
      .sources(esb.CompositeAggregation.termsValuesSource('sprintId', 'body.sprintId'))
      .size(10)
      .aggs([
        esb.sumAggregation('estimate', 'body.timeTracker.estimate'),
        esb.sumAggregation('actual', 'body.timeTracker.actual').script(sumActualScript),
      ]);
    if (afterKey) {
      compositeAgg = compositeAgg.after(afterKey);
    }
    const query = esb
      .requestBodySearch()
      .size(0)
      .agg(compositeAgg)
      .query(
        esb
          .boolQuery()
          .must([esb.termsQuery('body.sprintId', sprintIds)])
          .filter(esb.rangeQuery('body.timeTracker.estimate').gte(0))
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

    const estimateActualGraph: { sprint_aggregation: { buckets: BucketItem[] } } =
      await esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
    const sprintEstimate: SprintVariance[] = sprintData.map((sprintDetails: any) => {
      const item = estimateActualGraph.sprint_aggregation.buckets.find(
        (bucketItem: BucketItem) => bucketItem.key == sprintDetails.id
      );
      if (item) {
        return {
          sprint: sprintDetails,
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
        };
      } else {
        return {
          sprint: sprintDetails,
          time: {
            estimate: 0,
            actual: 0,
          },
          variance: 0,
        };
      }
    });

    const totalPages = Math.ceil(sprintEstimate.length / limit);
    return {
      data: sprintEstimate,
      totalPages,
      page,
    };
  } catch (e) {
    throw new Error(`error_occured_sprint_variance: ${e}`);
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
      .query(
        esb.boolQuery().must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.isDeleted', false),
          esb
            .boolQuery()
            .should([
              esb.rangeQuery('body.startDate').gte(startDate).lte(endDate),
              esb.rangeQuery('body.endDate').gte(startDate).lte(endDate),
            ])
            .minimumShouldMatch(1),
          esb
            .boolQuery()
            .should([
              esb.termQuery('body.state', SprintState.ACTIVE),
              esb.termQuery('body.state', SprintState.CLOSED),
            ])
            .minimumShouldMatch(1),
        ])
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
    throw new Error(`error_occured_sprint_variance_avg: ${e}`);
  }
}
