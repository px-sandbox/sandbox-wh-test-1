import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { rcaGraphResponse, rcaGraphView } from 'abstraction/jira/type';
import { logger } from 'core';
import { FILTER_ID_TYPES } from 'abstraction/jira/enums';
import { buildRcaTableViewQuery, getHeadlineData, mapRcaBucketsWithFullNames } from './get-rca-tabular-view';

const esClient = ElasticSearchClient.getInstance();

function sliceDataWithTotal(
  data: { name: string; percentage: number }[]
): { name: string; percentage: number }[] {
  // Slice the first 4 elements
  const slicedDataForFirstFiveEle = data.slice(0, 5);

  if (data.length > 5) {
    // Calculate the total count for the remaining elements
    const slicedDataMoreThanFourEle = data.slice(0, 4);
    const totalCount = parseFloat(
      data
        .slice(4)
        .reduce((acc, item) => acc + item.percentage, 0)
        .toFixed(2)
    );

    // Create the 5th element with the total count
    const totalElement = { name: 'Others', percentage: totalCount };

    // Combine the first 4 elements with the 5th element
    return [...slicedDataMoreThanFourEle, totalElement];
  }
  return slicedDataForFirstFiveEle;
}
export async function rcaGraphView(ids: string[], idType: FILTER_ID_TYPES, type: string): Promise<rcaGraphView> {
  // Build query based on ID type
  const query = await buildRcaTableViewQuery(ids, idType, type);
  logger.info({ message: 'rcaGraphView query', data: query });

  const response: rcaGraphResponse = (await esClient.search(
    Jira.Enums.IndexName.Issue,
    query
  )) as rcaGraphResponse;
  const QaRcaBuckets = response.aggregations.rcaCount?.buckets.map((bucket) => ({
    name: bucket.key,
    percentage: parseFloat(((bucket.doc_count / response.hits.total.value) * 100).toFixed(2)),
  }));

  const updatedQaRcaBuckets = await mapRcaBucketsWithFullNames();
  const headlineRCA = await getHeadlineData(type, ids, idType);
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
      value:
        headlineRCA.global_agg.total_bug_count.doc_count === 0
          ? 0
          : parseFloat(
            (
              (headlineRCA.max_rca_count.value /
                headlineRCA.global_agg.total_bug_count.doc_count) *
              100
            ).toFixed(2)
          ),
      names: headlineRCANames.length !== 0 ? headlineRCANames : [],
    },
    graphData,
    maximized: data,
  };
}
