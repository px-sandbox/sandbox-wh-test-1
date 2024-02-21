import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { mappingPrefixes } from 'src/constant/config';
import { initializeOctokit } from 'src/cron/github-copilot';
import { getOctokitResp } from 'src/util/octokit-response';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';

async function fetchPRComments(repoId: string, owner: string, repoName: string): Promise<void> {
  try {
    const esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    let prData: any = [];
    let from = 0;
    let size = 2;

    // fetch All PR data for given repo from Elasticsearch
    do {
      const { query } = esb
        .requestBodySearch()
        .size(size)
        .query(esb.boolQuery().must(esb.termQuery('body.repoId', repoId)))
        .from(from)
        .toJSON() as { query: object };

      const getPrData = await esClient.searchWithEsb(Github.Enums.IndexName.GitPull, query);
      const prFormattedData = await searchedDataFormator(getPrData);
      prData = prData.concat(prFormattedData);
      from += size;
    } while (prData.length == size);

    // call api to fetch pr comments for each pr data
    const octokit = await initializeOctokit();
    let prReviewCommentIdfromApi: number[] = [];
    await prData.forEach(async (prData: any) => {
      const commentsDataOnPr = await octokit(`GET /repos/${owner}/${repoName}/pulls/45/comments`);
      const octokitRespData = getOctokitResp(commentsDataOnPr);
      octokitRespData.forEach((comment: any) => {
        prReviewCommentIdfromApi.push(comment.id);
      });
      logger.info('pr_review_comment_id_from_ghapi', prReviewCommentIdfromApi);

      // Fetch PR comments from Elasticsearch for each PR
      const { query } = esb
        .requestBodySearch()
        .size(200) // assumed that there will not be more than 200 comments on a PR
        .query(esb.termQuery('body.pullId', prData.id))
        .toJSON() as { query: object };

      const prReviewCommentData = await esClient.searchWithEsb(
        Github.Enums.IndexName.GitPRReviewComment,
        query
      );
      const esPrReviewCommentFormattedData = await searchedDataFormator(prReviewCommentData);
      let prReviewCommentId: number[] = [];
      esPrReviewCommentFormattedData.map((prReviewComment: any) => {
        prReviewCommentId.push(prReviewComment.githubPRReviewCommentId);
      });
      logger.info('pr_review_comment_id_esb:', prReviewCommentId);

      // Find deleted comments id between Elasticsearch and Github API
      const deletedCommentIds = prReviewCommentId.filter(
        (id) => !prReviewCommentIdfromApi.includes(id)
      );
      logger.info('to_be_marked_deleted_commentIds:', deletedCommentIds);

      // Update isDeleted flag in Elasticsearch for deleted comments
      const matchQry = esb
        .boolQuery()
        .must([
          esb.termQuery('body.repoId', repoId),
          esb.termsQuery('body.githubPRReviewCommentId', deletedCommentIds),
        ])
        .toJSON();
      const script = esb.script('inline', 'ctx._source.body.isDeleted = true');
      logger.info('matchQry_delete_mark_comments:', matchQry);
      await esClient.updateByQuery(
        Github.Enums.IndexName.GitPRReviewComment,
        matchQry,
        script.toJSON()
      );
    });
  } catch (error) {
    console.error('Error fetching PR comments:', error);
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const repoIds = event.queryStringParameters?.repoIds;
  const owner = event.queryStringParameters?.owner;
  const repoName = event.queryStringParameters?.repoName;

  if (!repoIds || !owner || !repoName) {
    return responseParser
      .setBody('repoIds, owner, repoName are required')
      .setMessage('repoIds, owner, repoName are required')
      .setStatusCode(HttpStatusCode['400'])
      .setResponseBodyCode('BAD_REQUEST')
      .send();
  }
  const repos = await fetchPRComments(repoIds, owner, repoName);
  return responseParser
    .setBody({ headline: repos })
    .setMessage('Headline for update protected keyword in branch data')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
}
