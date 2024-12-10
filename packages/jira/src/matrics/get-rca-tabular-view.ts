import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { rcaTableHeadline, rcaTableView } from 'abstraction/jira/type';
import esb from 'elastic-builder';

const esClient = ElasticSearchClient.getInstance();

async function getHeadline(type: string) {
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.existsQuery('body.rcaData'),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
          esb.termsQuery('body.priority', ['Highest', 'High', 'Medium', 'Low', 'Lowest']),
          esb.termQuery(`body.contains${type}`, true),
        ])
    )
    .agg(
      esb
        .termsAggregation('rca_count')
        .field(`body.rcaData.${type}`)
        .agg(esb.valueCountAggregation('rca_value_count').field(`body.rcaData.${type}`))
    )
    .agg(esb.maxBucketAggregation('max_rca_count').bucketsPath('rca_count>rca_value_count'));
  const result: rcaTableHeadline = await esClient.queryAggs(
    Jira.Enums.IndexName.Issue,
    query.toJSON()
  );
  return { value: result.max_rca_count.value ?? 0, names: result.max_rca_count.keys };
}

export async function rcaQaTableDetailed(sprintIds: string[]): Promise<rcaTableView> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
        ])
        .filter(esb.termQuery('body.containsQARca', true))
    )
    .agg(esb.termsAggregation('rcaQaCount').field('body.rcaData.qaRca').size(1000));

  const esbQuery = query.toJSON();
  const response: any = await esClient.search(Jira.Enums.IndexName.Issue, esbQuery);
  const QaRcaBuckets = response.aggregations.rcaQaCount?.buckets.map((bucket: any) => ({
    name: bucket.key,
    count: bucket.doc_count,
  }));

  const query1 = esb.requestBodySearch().query(esb.termQuery('body.type', 'qa'));
  const esbQuery1 = query1.toJSON();
  const response1: any = await esClient.search(Jira.Enums.IndexName.Rca, esbQuery1);

  const updatedQaRcaBuckets = mapRcaBucketsWithFullNames(QaRcaBuckets, response1);

  return {
    headline: await getHeadline('qaRca'),
    tableData: updatedQaRcaBuckets,
  };
}

function mapRcaBucketsWithFullNames(rcaBuckets: any, response1: any) {
  const idToNameMap = response1.hits.hits.reduce((acc: any, hit: any) => {
    const id = hit._source.body.id;
    const name = hit._source.body.name;
    acc[id] = name;
    return acc;
  }, {});
  return rcaBuckets.map((bucket: { name: string | number; count: number }) => {
    const fullName = idToNameMap[bucket.name];
    return { name: fullName, count: bucket.count };
  });
}

export async function rcaDevTableDetailed(sprintIds: string[]): Promise<rcaTableView> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
        ])
        .filter(esb.termQuery('body.containsDevRca', true))
    )
    .agg(esb.termsAggregation('rcaDevCount').field(`body.rcaData.devRca`).size(1000));

  const esbQuery = query.toJSON();
  const response: any = await esClient.search(Jira.Enums.IndexName.Issue, esbQuery);
  const devRcaBuckets = response.aggregations.rcaDevCount?.buckets.map((bucket: any) => ({
    name: bucket.key,
    count: bucket.doc_count,
  }));

  const query1 = esb.requestBodySearch().query(esb.termQuery('body.type', 'dev'));
  const esbQuery1 = query1.toJSON();
  const response1: any = await esClient.search(Jira.Enums.IndexName.Rca, esbQuery1);

  const updatedDevRcaBuckets = mapRcaBucketsWithFullNames(devRcaBuckets, response1);
  return {
    headline: await getHeadline('devRca'),
    tableData: updatedDevRcaBuckets,
  };
}
