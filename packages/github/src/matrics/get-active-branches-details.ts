import { logger } from 'core';
import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import moment from 'moment';
import { FormattedData } from 'abstraction/other/type';
import { searchedDataFormator } from '../util/response-formatter';

const esClient = ElasticSearchClient.getInstance();

interface PRStatusDetails extends FormattedData {
  isDraft?: boolean;
  state?: Github.Enums.PullRequest;
  merged?: boolean;
}

const determinePRStatus = (prStatusDetails: PRStatusDetails | null): Github.Type.PRStatus => {
  if (!prStatusDetails) {
    return Github.Type.PRStatus.noPr;
  }

  if (prStatusDetails.isDraft && prStatusDetails.state === Github.Enums.PullRequest.Open) {
    return Github.Type.PRStatus.draft;
  }

  if (prStatusDetails.state === Github.Enums.PullRequest.Closed) {
    return prStatusDetails.merged
      ? Github.Type.PRStatus.merged
      : Github.Type.PRStatus.closedWithoutMerge;
  }

  if (prStatusDetails.state === Github.Enums.PullRequest.Open) {
    return Github.Type.PRStatus.opened;
  }

  return Github.Type.PRStatus.noPr;
};

const getBranchDetails = async (
  item: Github.Type.BranchEsResponse,
  requestId: string
): Promise<Github.Type.ActiveBranchDetails> => {
  logger.info({
    message: 'getBranchDetails.input',
    data: {
      branchName: item.name,
      repoId: item.repoId,
      authorId: item.authorId,
    },
    requestId,
  });
  const [lastCommitData, prStatusData, authorDetailsData] = await Promise.all([
    esClient.search(
      Github.Enums.IndexName.GitCommits,
      esb
        .requestBodySearch()
        .size(1)
        .query(
          esb
            .boolQuery()
            .must([
              esb.termQuery('body.pushedBranch', item.name),
              esb.termQuery('body.repoId', item.repoId),
            ])
        )
        .sort(esb.sort('body.createdAt', 'desc'))
        .toJSON()
    ),
    esClient.search(
      Github.Enums.IndexName.GitPull,
      esb
        .requestBodySearch()
        .size(1)
        .query(
          esb
            .boolQuery()
            .must([
              esb.termQuery('body.head.ref', item.name),
              esb.termQuery('body.repoId', item.repoId),
            ])
        )
        .sort(esb.sort('body.createdAt', 'desc'))
        .toJSON()
    ),
    esClient.search(
      Github.Enums.IndexName.GitUsers,
      esb
        .requestBodySearch()
        .query(
          esb
            .boolQuery()
            .must([
              esb.termQuery('body.id', item.authorId ?? ''),
              esb.termQuery('body.isDeleted', false),
            ])
        )
        .toJSON()
    ),
  ]);

  const [lastCommitDetails] = await searchedDataFormator(lastCommitData);
  const [prStatusDetails] = await searchedDataFormator(prStatusData);
  const [authorDetails] = await searchedDataFormator(authorDetailsData);
  logger.info({
    message: 'prStatusDetails.info',
    data: {
      repoId: item.repoId,
      branchName: item.name,
      lastCommitData: {
        createdAt: lastCommitDetails?.createdAt,
        pushedBranch: lastCommitDetails?.pushedBranch,
      },
      prStatusData: { state: prStatusDetails?.state, pullNumber: prStatusDetails?.number },
    },
    requestId,
  });

  const prStatus = determinePRStatus(prStatusDetails);

  return {
    id: item.id,
    name: item.name,
    lastCommitDate: lastCommitDetails?.createdAt ?? '-',
    author: {
      id: authorDetails?.id ?? '-',
      name: authorDetails?.userName ?? '-',
    },
    prStatus,
    createdSince: moment(item.createdAt).fromNow(),
  };
};

export const activeBranchDetailsGraphData = async (
  repoIds: string[],
  requestId: string,
  page: number,
  limit: number
): Promise<{ totalPages: number; page: number; graphData: Github.Type.ActiveBranchDetails[] }> => {
  try {
    logger.info({
      message: 'activeBranchDetailsGraphData.input',
      data: {
        repoIds,
        page,
        limit,
      },
      requestId,
    });
    // TODO: Implement the actual logic to fetch active branches details graph data
    // fetch all the branches using pagination of the given repos
    const query = esb
      .requestBodySearch()
      .size(limit)
      .from((page - 1) * limit)
      .query(
        esb
          .boolQuery()
          .must([esb.termsQuery('body.repoId', repoIds), esb.termQuery('body.isDeleted', false)])
      )
      .sort(esb.sort('body.createdAt', 'desc'))
      .toJSON();

    logger.info({
      message: 'getGraphDataQuery.info ACTIVE_BRANCHES_GRAPH_ESB_QUERY',
      data: JSON.stringify(query),
      requestId,
    });
    const data: Other.Type.HitBody = await esClient.search(Github.Enums.IndexName.GitBranch, query);
    const activeBranchDetails = await searchedDataFormator(data);

    const graphData = await Promise.all(
      activeBranchDetails.map((item: Github.Type.BranchEsResponse) =>
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
