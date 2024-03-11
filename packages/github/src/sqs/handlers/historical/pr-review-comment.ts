import { ElasticSearchClient, ElasticSearchClientGh } from '@pulse/elasticsearch';
import { SQSClient, SQSClientGh } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import { initializeOctokit } from 'src/cron/github-copilot';
import { getOctokitResp } from 'src/util/octokit-response';
import { searchedDataFormator } from 'src/util/response-formatter';
import { logProcessToRetry } from 'src/util/retry-process';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';

const esClient = ElasticSearchClientGh.getInstance();
const sqsClient = SQSClientGh.getInstance();

export const handler = async function pr_review_comment(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        const { owner, repoName, prData } = messageBody;
        const octokit = await initializeOctokit();
        let prReviewCommentIdfromApi: number[] = [];
        // await prFormattedData.map(async (prData: any) => {
        const commentsDataOnPr = await octokit(
          `GET /repos/${owner}/${repoName}/pulls/${prData.pullNumber}/comments`
        );
        const octokitRespData = getOctokitResp(commentsDataOnPr);
        octokitRespData.forEach((comment: any) => {
          prReviewCommentIdfromApi.push(comment.id);
        });
        logger.info(`pr_review_comment_id_from_ghapi: ${prReviewCommentIdfromApi}`);

        // Fetch PR comments from Elasticsearch for each PR
        const { query } = esb
          .requestBodySearch() // assumed that there will not be more than 200 comments on a PR
          .query(esb.boolQuery().must(esb.termQuery('body.pullId', prData.id)))
          .toJSON() as { query: object };
        const prReviewCommentData = await esClient.searchWithEsb(
          Github.Enums.IndexName.GitPRReviewComment,
          query,
          0,
          1000
        );
        const esPrReviewCommentFormattedData = await searchedDataFormator(prReviewCommentData);
        let prReviewCommentId: number[] = [];
        esPrReviewCommentFormattedData.forEach((prReviewComment: any) => {
          prReviewCommentId.push(prReviewComment.githubPRReviewCommentId);
        });
        logger.info(`pr_review_comment_id_from_es: ${prReviewCommentId}`);

        // Find deleted comments id between Elasticsearch and Github API
        const deletedCommentIds = prReviewCommentId.filter(
          (id) => !prReviewCommentIdfromApi.includes(id)
        );
        logger.info(`to_be_marked_deleted_commentIds:${deletedCommentIds}`);
        // Update isDeleted flag in Elasticsearch for deleted comments
        const matchQry = esb
          .boolQuery()
          .must([
            esb.termQuery('body.repoId', prData.repoId),
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

        //Update PR Data
        await sqsClient.sendMessage(
          {
            id: prData._id,
            body: {
              ...prData,
              reviewComments: prReviewCommentIdfromApi.length,
            },
          },
          Queue.qGhIndex.queueUrl
        );
      } catch (error) {
        logger.error(`migration.reviews_comment.error: ${error}`);
        await logProcessToRetry(record, Queue.qGhPrReviewCommentMigration.queueUrl, error as Error);
      }
    })
  );
};
