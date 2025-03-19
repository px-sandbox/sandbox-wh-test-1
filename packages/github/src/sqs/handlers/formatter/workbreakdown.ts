import { IndexName as GithubIndices } from 'abstraction/github/enums';
import { ElasticSearchClient } from "@pulse/elasticsearch";
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry, deleteProcessfromDdb } from 'rp';
import { Github } from 'abstraction';


const elasticsearchClient = ElasticSearchClient.getInstance();

const processCommits = async (payload: Github.ExternalType.Webhook.WorkbreakdownMessage) => {
  logger.info({message: "processCommits.invoked", data: {payload}, requestId: payload.reqCtx.requestId});
  const { commitId, repoId, orgId, workbreakdown, processId } = payload.message;
      const { requestId, resourceId } = payload.reqCtx;

      // Search for the commit in elasticsearch
      const searchResult = await elasticsearchClient.search(
        GithubIndices.GitCommits,
        {query: {
            bool: {
              must: [
                { term: { "body.githubCommitId": commitId } },
                { term: { "body.repoId": repoId } },
                { term: { "body.organizationId": orgId } }
              ]
            }
          }});


      // Check if commit exists
      if (searchResult.hits.total.value === 0) {
        throw new Error(`Commit not found: ${commitId} for repo: ${repoId} and org: ${orgId}`);
      }

      const updatedData = {
        id: searchResult.hits.hits[0]._id,
        body: {
          ...searchResult.hits.hits[0]._source.body,
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
    try {
      const payload = JSON.parse(record.body) as Github.ExternalType.Webhook.WorkbreakdownMessage;
      await processCommits(payload);
    } catch (error) {
      console.error('Error processing workbreakdown:', {
        error,
        record: record.body,
        errorMessage: error.message,
        stack: error.stack
      });

      await logProcessToRetry(record, Queue.qGhWorkbreakdown.queueUrl, error as Error);
    }
  }
}; 