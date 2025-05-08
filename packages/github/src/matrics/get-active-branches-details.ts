import { logger } from 'core';
import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import moment from 'moment';
import { searchedDataFormator } from '../util/response-formatter';

const esClient = ElasticSearchClient.getInstance();

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
    const graphData = activeBranchDetails.map((item: Github.Type.ActiveBranchDetails) => ({
      id: item.id,
      name: item.name,
      lastCommitDate: '2025-04-30T09:17:20.431Z',
      author: {
        // migrate for author in the branch
        id: 'gh_user_123',
        name: 'Xyz',
      },
      prStatus: 'merged',
      createdSince: moment(item.createdAt).fromNow(),
    }));
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
