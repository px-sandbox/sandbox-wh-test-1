import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github, Other } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { initializeOctokit } from '../../../cron/github-copilot';
import { getOctokitResp } from '../../../util/octokit-response';
import { searchedDataFormator } from '../../../util/response-formatter';
import { logProcessToRetry } from '../../../util/retry-process';

const esClient = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

const fetchPRComments = async (prId:number):Promise<object[]> => {
  // Fetch PR comments from Elasticsearch for each PR
  const query = esb
    .requestBodySearch()
    .size(1000)// assumed that there will not be more than 200 comments on a PR
    .query(esb.boolQuery().must(esb.termQuery('body.pullId', prId)))
    .toJSON();
  const prReviewCommentData = await esClient.search(
    Github.Enums.IndexName.GitPRReviewComment,
    query
  );
  const esPrReviewCommentFormattedData = await searchedDataFormator(prReviewCommentData);
  return esPrReviewCommentFormattedData;
}
const updateDeletedComments = async (deletedCommentIds:number[],repoId:string, reqCntx:Other.Type.RequestCtx):Promise<void> => {
  // Update isDeleted flag in Elasticsearch for deleted comments
  const matchQry = esb
    .boolQuery()
    .must([
      esb.termQuery('body.repoId', repoId),
      esb.termsQuery('body.githubPRReviewCommentId', deletedCommentIds),
    ])
    .toJSON();
  const script = esb.script('inline', 'ctx._source.body.isDeleted = true');
  logger.info({ message: 'matchQry_delete_mark_comments:', data: JSON.stringify(matchQry), ...reqCntx});
  await esClient.updateByQuery(
    Github.Enums.IndexName.GitPRReviewComment,
    matchQry,
    script.toJSON()
  );
}
export const handler = async function prReviewComment(event: SQSEvent): Promise<void> {
  logger.info({ message: "Records Length", data: event.Records.length});
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const { reqCntx: { requestId, resourceId }, messageBody } = JSON.parse(record.body);
      try {
        const { owner, repoName, prData } = messageBody;
        const octokit = await initializeOctokit();
        const prReviewCommentIdfromApi: number[] = [];
        // await prFormattedData.map(async (prData: any) => {
        const commentsDataOnPr = await octokit(
          `GET /repos/${owner}/${repoName}/pulls/${prData.pullNumber}/comments`
        );
        const octokitRespData = getOctokitResp(commentsDataOnPr);
        octokitRespData.forEach((comment: any) => {
          prReviewCommentIdfromApi.push(comment.id);
        });
        logger.info({ message: "pr_review_comment_id_from_ghapi", data:prReviewCommentIdfromApi, requestId, resourceId });

        const esPrReviewCommentFormattedData = await fetchPRComments(prData.id);
        const prReviewCommentId: number[] = [];
        esPrReviewCommentFormattedData.forEach((prReviewComments: any) => {
          prReviewCommentId.push(prReviewComments.githubPRReviewCommentId);
        });
        logger.info({ message: "pr_review_comment_id_from_es",  data: prReviewCommentId, requestId, resourceId});

        // Find deleted comments id between Elasticsearch and Github API
        const deletedCommentIds = prReviewCommentId.filter(
          (id) => !prReviewCommentIdfromApi.includes(id)
        );
        logger.info({ message: "to_be_marked_deleted_commentIds", data: deletedCommentIds, requestId, resourceId});
       
        await updateDeletedComments(deletedCommentIds, prData.repoId, { requestId, resourceId });
        // Update PR Data
        await sqsClient.sendMessage(
          {
            id: prData._id,
            body: {
              ...prData,
              reviewComments: prReviewCommentIdfromApi.length,
            },
          },
          Queue.qGhIndex.queueUrl,
          { requestId, resourceId }
        );
      } catch (error) {
        logger.error({ message: "migration.reviews_comment.error", error, requestId, resourceId});
        await logProcessToRetry(record, Queue.qGhPrReviewCommentMigration.queueUrl, error as Error);
      }
    })
  );
};
