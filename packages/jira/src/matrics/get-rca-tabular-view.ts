import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { rcaTableRespnose, rcaTableView } from 'abstraction/jira/type';
import esb from 'elastic-builder';
import { head, max } from 'lodash';
import { updateRefreshToken } from 'src/cron/refresh-token';

const esClient = ElasticSearchClient.getInstance();

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
    headline: getHeadline(response, QaRcaBuckets),
    data: updatedQaRcaBuckets,
  };
}
function getHeadline(response: any, buckets: any) {
  let max = 0,
    name = '';
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].count > max) {
      max = buckets[i].count;
      name = buckets[i].name;
    }
  }

  const headline = `${name} = ${(max / response.hits.total.value) * 100}`;
  return headline;
}
function mapRcaBucketsWithFullNames(rcaBuckets:any, response1:any) {
  const idToNameMap = response1.hits.hits.reduce((acc:any, hit:any) => {
    const id = hit._source.body.id;
    const name = hit._source.body.name;
    acc[id] = name;
    return acc;
  }, {});
  return rcaBuckets.map((bucket: { name: string | number; count: number; }) => {
    const fullName = idToNameMap[bucket.name]; 
    return { name: fullName ,count: bucket.count}; 
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
    headline: getHeadline(response, devRcaBuckets),
    data: updatedDevRcaBuckets,
  };
}
