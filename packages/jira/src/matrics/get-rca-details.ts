import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { currType, rcaDetailRespnose, rcaDetailType } from 'abstraction/jira/type';
import esb from 'elastic-builder';

const esClient = ElasticSearchClient.getInstance();

export async function rcaDevDetail(sprintIds: string[]): Promise<rcaDetailType> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .agg(
      esb
        .compositeAggregation('by_rca')
        .sources(
          esb.CompositeAggregation.termsValuesSource('rca_name', `body.rcaData.devRca`),
          esb.CompositeAggregation.termsValuesSource('priority', 'body.priority')
        )
        .agg(esb.valueCountAggregation('priority_count').field('body.priority'))
    );

  const esbQuery = query.toJSON();
  const response: rcaDetailRespnose = await esClient.queryAggs(
    Jira.Enums.IndexName.Issue,
    esbQuery
  );

  const result = response.by_rca.buckets.reduce((acc: any, curr: currType) => {
    const rcaName = curr.key.rca_name;
    const priority = curr.key.priority;
    const count = curr.priority_count.value;

    let group = acc.find((item: { name: string }) => item.name === rcaName);

    if (group) {
      group[priority] = count;
    } else {
      acc.push({ name: rcaName, [priority]: count });
    }
    return acc;
  }, []);

  return { data: result };
}


export async function rcaQaDetail(sprintIds: string[]): Promise<rcaDetailType> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .agg(
      esb
        .compositeAggregation('by_rca')
        .sources(
          esb.CompositeAggregation.termsValuesSource('rca_name', `body.rcaData.qaRca`),
          esb.CompositeAggregation.termsValuesSource('priority', 'body.priority')
        )
        .agg(esb.valueCountAggregation('priority_count').field('body.priority'))
    );

  const esbQuery = query.toJSON();
  const response: rcaDetailRespnose = await esClient.queryAggs(
    Jira.Enums.IndexName.Issue,
    esbQuery
  );

  const result = response.by_rca.buckets.reduce((acc: any, curr: currType) => {
    const rcaName = curr.key.rca_name;
    const priority = curr.key.priority;
    const count = curr.priority_count.value;

    let group = acc.find((item: { name: string }) => item.name === rcaName);

    if (group) {
      group[priority] = count;
    } else {
      acc.push({ name: rcaName, [priority]: count });
    }
    return acc;
  }, []);

  return { data: result };
}
