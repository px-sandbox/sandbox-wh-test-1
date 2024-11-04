import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { processGraphInterval } from 'src/util/process-graph-intervals';

const esClientObj = ElasticSearchClient.getInstance();
export async function getDeploymentFrequencyGraphData(
  startDate: string,
  endDate: string,
  repoIds: string[],
  interval: string,
  env: string[]
) {
  const query = esb.requestBodySearch().size(0);

  const mustQueries = [
    esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
    esb.termsQuery('body.repoId', repoIds),
  ];

  if (env) {
    mustQueries.push(esb.termsQuery('body.env', env));
  }

  const deploymentFrequencyQuery = query.query(esb.boolQuery().must(mustQueries));
  const graphIntervals = processGraphInterval(interval, startDate, endDate, 'body.createdAt');
  deploymentFrequencyQuery.agg(
    graphIntervals.agg(esb.termsAggregation('by_dest', 'body.destination'))
  );

  logger.info({
    message: 'getDeploymentFrequencyGraphData',
    data: JSON.stringify(deploymentFrequencyQuery.toJSON()),
  });

  const data: Github.Type.DeploymentFrequencyGraph = await esClientObj.queryAggs(
    Github.Enums.IndexName.GitDeploymentFrequency,
    deploymentFrequencyQuery.toJSON()
  );

  const result = data.commentsPerDay.buckets.map((bucket) => {
    return {
      date: bucket.key_as_string,
      ...bucket.by_dest.buckets.reduce(
        (acc: { [key: string]: number }, item: { key: string; doc_count: number }) => {
          acc[item.key] = item.doc_count;
          return acc;
        },
        {}
      ),
    };
  });
  return result;
}
