import { logger } from 'core';
import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import moment from 'moment';
import { searchedDataFormator } from '../util/response-formatter';

const esClient = ElasticSearchClient.getInstance();

const getBranchDetails = async (
  item: Github.Type.ActiveBranchDetails,
  requestId: string
): Promise<Github.Type.ActiveBranchDetails> => {
  const lastCommitQuery = esb
    .requestBodySearch()
    .size(1)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.pushedBranch', item.name),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .sort(esb.sort('body.createdAt', 'desc'))
    .toJSON();
  const lastCommitData: Other.Type.HitBody = await esClient.search(
    Github.Enums.IndexName.GitCommits,
    lastCommitQuery
  );
  logger.info({
    message: 'lastCommitData.info',
    data: JSON.stringify(lastCommitData),
    requestId,
  });

  const [lastCommitDetails] = await searchedDataFormator(lastCommitData);

  const prStatusQuery = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.head.ref', item.name), esb.termQuery('body.isDeleted', false)])
    )
    .sort(esb.sort('body.createdAt', 'desc'))
    .toJSON();
  const prStatusData: Other.Type.HitBody = await esClient.search(
    Github.Enums.IndexName.GitPull,
    prStatusQuery
  );
  logger.info({
    message: 'prStatusData.info',
    data: JSON.stringify(prStatusData),
    requestId,
  });
  const [prStatusDetails] = await searchedDataFormator(prStatusData);

  return {
    id: item.id,
    name: item.name,
    lastCommitDate: lastCommitDetails?.createdAt ?? '-',
    author: {
      id: 'gh_user_123',
      name: 'Xyz',
    },
    prStatus: prStatusDetails?.state ?? Github.Type.PRStatus.noPr,
    createdSince: moment(item.createdAt).fromNow(),
  };
};

export const activeBranchDetailsGraphData = async (
  startDate: string,
  endDate: string,
  repoIds: string[],
  requestId: string,
  page: number,
  limit: number
): Promise<{ totalPages: number; page: number; graphData: Github.Type.ActiveBranchDetails[] }> => {
  try {
    // TODO: Implement the actual logic to fetch active branches details graph data
    // create an esb query using dateRangehistogram function
    // fetch all the branches using pagination of the given repos
    const query = esb
      .requestBodySearch()
      .size(limit)
      .from(page)
      .query(
        esb
          .boolQuery()
          .must([
            esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
            esb.termsQuery('body.repoId', repoIds),
            esb.termQuery('body.isDeleted', false),
          ])
      )
      .toJSON();

    logger.info({
      message: 'getGraphDataQuery.info ACTIVE_BRANCHES_GRAPH_ESB_QUERY',
      data: JSON.stringify(query),
      requestId,
    });
    const data: Other.Type.HitBody = await esClient.search(Github.Enums.IndexName.GitBranch, query);
    const activeBranchDetails = await searchedDataFormator(data);

    const graphData = await Promise.all(
      activeBranchDetails.map((item: Github.Type.ActiveBranchDetails) =>
        getBranchDetails(item, requestId)
      )
    );
    const totalPages = Math.ceil(data.hits.total.value / limit);
    return { totalPages, page, graphData };
  } catch (error) {
    logger.error({
      message: 'Error fetching active branches details graph data',
      error,
      requestId,
    });
    throw error;
  }
};
