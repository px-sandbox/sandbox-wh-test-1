import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { processGraphInterval } from '../util/process-graph-intervals';

const esClientObj = ElasticSearchClient.getInstance();

// async function getBranchesByRepoId(repoId: string[]): Promise<Github.Type.BranchRep[]> {
//   const query = esb
//     .requestBodySearch()
//     .query(
//       esb
//         .boolQuery()
//         .must([esb.termsQuery('body.repoId', repoId), esb.termQuery('body.protected', false)])
//     );
//   const data = await esClientObj.search(Github.Enums.IndexName.GitBranch, query.toJSON());
//   const formattedData = await searchedDataFormator(data);
//   return formattedData;
// }

export async function getDeploymentFrequencyGraphData(
  startDate: string,
  endDate: string,
  repoIds: string[],
  interval: string,
  destination: string[]
): Promise<
  {
    date: string;
  }[]
> {
  const query = esb.requestBodySearch().size(0);

  const allBranchObj = destination.reduce((acc: { [x: string]: number }, branch) => {
    acc[branch] = 0;
    return acc;
  }, {});

  const mustQueries = [
    esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
    esb.termsQuery('body.repoId', repoIds),
  ];

  if (destination.length > 0) {
    mustQueries.push(esb.termsQuery('body.destination', destination));
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

  const result = data.commentsPerDay.buckets.map((bucket) => ({
    date: bucket.key_as_string,
    ...allBranchObj,
    ...bucket.by_dest.buckets.reduce(
      (acc: { [key: string]: number }, item: { key: string; doc_count: number }) => {
        acc[item.key] = item.doc_count;
        return acc;
      },
      {}
    ),
  }));
  return result;
}
