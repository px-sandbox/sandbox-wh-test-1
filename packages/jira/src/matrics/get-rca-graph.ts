import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { rcaGraphResponse, rcaTableHeadline, rcaTableView } from 'abstraction/jira/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { mappingPrefixes } from 'src/constant/config';
import { searchedDataFormator } from 'src/util/response-formatter';

const esClient = ElasticSearchClient.getInstance();
export async function mapRcaBucketsWithFullNames() {
  const rcaNameQuery = esb.requestBodySearch().query(esb.matchAllQuery()).toJSON();
  const rcaRes: any = await esClient.search(Jira.Enums.IndexName.Rca, rcaNameQuery);
  const resData = await searchedDataFormator(rcaRes);
  const idToNameMap = resData.reduce((acc: any, hit: any) => {
    const id = `${mappingPrefixes.rca}_${hit.id}`;
    const name = hit.name;
    acc[id] = name;
    return acc;
  }, {});
  return idToNameMap;
}

async function getHeadline(type: string) {
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

export async function rcaGraphView(sprintIds: string[], type: string): Promise<rcaTableView> {
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
        ])
    )
    .agg(esb.termsAggregation('rcaCount').field(`body.rcaData.${type}`).size(1000))
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
    )
    .toJSON();

  const response: rcaGraphResponse = await esClient.queryAggs(Jira.Enums.IndexName.Issue, query);
  const totalBugCount = response.global_agg.total_bug_count.doc_count;
  const QaRcaBuckets = response.rcaCount?.buckets.map((bucket: any) => ({
    name: bucket.key,
    percentage: parseFloat(((bucket.doc_count / totalBugCount) * 100).toFixed(2)),
  }));
  const updatedQaRcaBuckets = await mapRcaBucketsWithFullNames();
  const headlineRCA = await getHeadline(type);
  const data = QaRcaBuckets.map((bucket: { name: string | number; percentage: number }) => {
    const fullName = updatedQaRcaBuckets[bucket.name];
    return { name: fullName ?? '', count: bucket.percentage };
  });
  logger.info({ message: 'rca.graph', data: { data, headlineRCA } });
  const headlineRCANames: string[] = headlineRCA.max_rca_count.keys.map(
    (name) => updatedQaRcaBuckets[name]
  );
  return {
    headline: {
      value: parseFloat(
        (
          (headlineRCA.max_rca_count.value / headlineRCA.global_agg.total_bug_count.doc_count) *
          100
        ).toFixed(2)
      ),
      names: headlineRCANames.length !== 0 ? headlineRCANames : [],
    },
    tableData: data,
  };
}
