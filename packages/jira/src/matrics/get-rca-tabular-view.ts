import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { rcaTableHeadline, rcaTableResponse, rcaTableView } from 'abstraction/jira/type';
import esb from 'elastic-builder';
import { mappingPrefixes } from 'src/constant/config';
import { searchedDataFormator } from 'src/util/response-formatter';

const esClient = ElasticSearchClient.getInstance();
export async function mapRcaBucketsWithFullNames() {
  const rcaNameQuery = esb.requestBodySearch().query(esb.matchAllQuery()).size(100).toJSON();
  const rcaRes = await esClient.search(Jira.Enums.IndexName.Rca, rcaNameQuery);
  const resData = await searchedDataFormator(rcaRes);
  const idToNameMap = resData.reduce((acc: any, hit: any) => {
    const id = `${mappingPrefixes.rca}_${hit.id}`;
    const name = hit.name;
    acc[id] = name;
    return acc;
  }, {});
  return idToNameMap;
}

async function getHeadline(type: string, sprintIds: string[]): Promise<rcaTableHeadline> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.existsQuery(`body.rcaData.${type}`),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
          esb.termsQuery('body.priority', ['Highest', 'High', 'Medium']),
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery('body.sprintId', sprintIds),
        ])
    )
    .agg(
      esb
        .termsAggregation('rca_count')
        .field(`body.rcaData.${type}`)
        .agg(esb.valueCountAggregation('rca_value_count').field(`body.rcaData.${type}`))
    )
    .agg(esb.maxBucketAggregation('max_rca_count').bucketsPath('rca_count>rca_value_count'))
    .agg(
      esb
        .globalAggregation('global_agg')
        .aggs([
          esb
            .filterAggregation('total_bug_count')
            .filter(
              esb
                .boolQuery()
                .must([
                  esb.termQuery('body.issueType', IssuesTypes.BUG),
                  esb.existsQuery(`body.rcaData.${type}`),
                ])
            ),
        ])
    );

  const result: rcaTableHeadline = await esClient.queryAggs(
    Jira.Enums.IndexName.Issue,
    query.toJSON()
  );
  return result;
}

export async function rcaTableView(sprintIds: string[], type: string): Promise<rcaTableView> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
          esb.existsQuery(`body.rcaData.${type}`),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .agg(esb.termsAggregation('rcaCount').field(`body.rcaData.${type}`).size(1000))
    .toJSON();

  const response: rcaTableResponse = await esClient.queryAggs(Jira.Enums.IndexName.Issue, query);
  const QaRcaBuckets = response.rcaCount?.buckets.map((bucket) => ({
    name: bucket.key,
    count: bucket.doc_count,
  }));
  const updatedQaRcaBuckets = await mapRcaBucketsWithFullNames();
  const headlineRCA = await getHeadline(type, sprintIds);
  const data = QaRcaBuckets.map((bucket: { name: string | number; count: number }) => {
    const fullName = updatedQaRcaBuckets[bucket.name];
    return { name: fullName ?? '', count: bucket.count };
  });
  const headlineRCANames = headlineRCA.max_rca_count.keys.map((name) => updatedQaRcaBuckets[name]);
  return {
    headline: {
      value: parseFloat(
        (
          (headlineRCA.max_rca_count.value / headlineRCA.global_agg.total_bug_count.doc_count) *
          100
        ).toFixed(2)
      ),
      names: headlineRCANames,
    },
    tableData: data,
  };
}
