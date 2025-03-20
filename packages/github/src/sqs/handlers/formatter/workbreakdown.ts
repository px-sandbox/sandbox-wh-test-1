import { IndexName as GithubIndices } from 'abstraction/github/enums';
import { ElasticSearchClient } from "@pulse/elasticsearch";
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry, deleteProcessfromDdb } from 'rp';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from './../../../util/response-formatter';
import _ from 'lodash';


const elasticsearchClient = ElasticSearchClient.getInstance();

const processCommits = async (payload: Github.ExternalType.Webhook.WorkbreakdownMessage) => {
  logger.info({message: "processCommits.invoked", data: {payload}, requestId: payload.reqCtx.requestId});
  const { commitId, repoId, orgId, workbreakdown, processId } = payload.message;
      const { requestId, resourceId } = payload.reqCtx;

      // Search for the commit in elasticsearch using esb
      const query = esb.requestBodySearch()
        .query(
          esb.boolQuery()
            .must([
              esb.termQuery('body.githubCommitId', commitId),
              esb.termQuery('body.repoId', repoId),
              esb.termQuery('body.organizationId', orgId)
            ])
        )
        .toJSON();

      const searchResult = await elasticsearchClient.search(GithubIndices.GitCommits, query);
      const [commit] = await searchedDataFormator(searchResult);

      // Check if commit exists
      if (!commit) {
        throw new Error(`Commit not found: ${commitId} for repo: ${repoId} and org: ${orgId}`);
      }

      const updatedData = {
        id: commit._id,
        body: {
          ..._.omit(commit, ['_id']),
          workbreakdown
        }
      }
      // Update the commit with workbreakdown data
      await elasticsearchClient.putDocument(
        GithubIndices.GitCommits,
        updatedData
      );

      deleteProcessfromDdb(processId, {requestId, resourceId});
      logger.info({message: "processCommits.completed", data: {payload}, requestId: payload.reqCtx.requestId});
}

export const handler = async (event: SQSEvent ) => {
  
  for (const record of event.Records) {
    const payload = JSON.parse(record.body) as Github.ExternalType.Webhook.WorkbreakdownMessage;
    try {
      await processCommits(payload);
    } catch (error) {
      logger.error({message: "handler.error", error, requestId: payload.reqCtx.requestId});

      await logProcessToRetry(record, Queue.qGhWorkbreakdown.queueUrl, error as Error);
    }
  }
}; 