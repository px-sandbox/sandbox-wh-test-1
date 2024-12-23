import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { rcaGraphResponse, rcaGraphView, rcaTableHeadline } from 'abstraction/jira/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { mappingPrefixes } from 'src/constant/config';
import { searchedDataFormator } from 'src/util/response-formatter';

const esClient = ElasticSearchClient.getInstance();
export async function mapRcaBucketsWithFullNames() {
  const rcaNameQuery = esb.requestBodySearch().query(esb.matchAllQuery()).toJSON();
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
          esb.termQuery('body.isDeleted', false),
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

function sliceDataWithTotal(
  data: { name: string; percentage: number }[]
): { name: string; percentage: number }[] {
  // Slice the first 4 elements
  const slicedData = data.slice(0, 4);

  // Calculate the total count for the remaining elements
  const totalCount = parseFloat(
    data
      .slice(4)
      .reduce((acc, item) => acc + item.percentage, 0)
      .toFixed(2)
  );

  // Create the 5th element with the total count
  const totalElement = { name: 'Others', percentage: totalCount };

  // Combine the first 4 elements with the 5th element
  return [...slicedData, totalElement];
}
export async function rcaGraphView(sprintIds: string[], type: string): Promise<rcaGraphView> {
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
  const QaRcaBuckets = response.rcaCount?.buckets.map((bucket) => ({
    name: bucket.key,
    percentage: parseFloat(((bucket.doc_count / totalBugCount) * 100).toFixed(2)),
  }));

  const updatedQaRcaBuckets = await mapRcaBucketsWithFullNames();
  const headlineRCA = await getHeadline(type);
  const data = QaRcaBuckets.map((bucket: { name: string | number; percentage: number }) => {
    const fullName = updatedQaRcaBuckets[bucket.name];
    return { name: fullName ?? '', percentage: bucket.percentage };
  });
  logger.info({ message: 'rca.graph', data: { data, headlineRCA } });
  const headlineRCANames: string[] = headlineRCA.max_rca_count.keys.map(
    (name) => updatedQaRcaBuckets[name]
  );
  const graphData = sliceDataWithTotal(data);
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
    graphData,
    maximized: data,
  };
}
