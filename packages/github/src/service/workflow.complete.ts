import { OctokitResponse } from '@octokit/types';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { getPullRequestById } from '../lib/get-pull-request';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { ghRequest } from '../lib/request-default';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';

interface WorkflowArtifact {
  id: number;
  node_id: string;
  name: string;
  size_in_bytes: number;
  url: string;
  archive_download_url: string;
  expired: boolean;
  created_at: string;
  expires_at: string;
}
const sqsClient = SQSClient.getInstance();

async function processArtifact(
  workflowRunData: Github.ExternalType.Webhook.WorkflowRunCompleted,
  artifacts: WorkflowArtifact[],
  requestId: string
): Promise<void> {
  const {
    organization: { id: organizationId, login: orgName },
    repository: { id: repoId },
  } = workflowRunData;
  await Promise.all(
    artifacts.map(async (artifact) => {
      // switch case for the workflowActionName
      const { name, archive_download_url: artifactDownloadUrl, created_at: createdAt } = artifact;
      switch (name) {
        case Github.Enums.WorkflowAction.PulseVersionUpgradesReport:
          // call the queue to process the artifact
          await sqsClient.sendMessage(
            {
              organizationId,
              orgName,
              repoId,
              branch: workflowRunData.pull_request.head.ref,
              artifactDownloadUrl,
            },
            Queue.qRepoLibS3V2.queueUrl,
            { requestId }
          );
          break;
        case Github.Enums.WorkflowAction.PulseSecurityErrorsReport:
          await sqsClient.sendMessage(
            {
              organizationId,
              orgName,
              repoId,
              branch: workflowRunData.pull_request.head.ref,
              artifactDownloadUrl,
            },
            Queue.qGhRepoSastErrorV2.queueUrl,
            { requestId }
          );
          break;
        case Github.Enums.WorkflowAction.PulseTestCaseCoverageReport:
          await sqsClient.sendMessage(
            {
              organizationId,
              repoId,
              orgName,
              createdAt,
              artifactDownloadUrl,
            },
            Queue.qGhTestCoverageV2.queueUrl,
            { requestId }
          );
          break;
        case Github.Enums.WorkflowAction.PulseWorkBreakdownReport:
          await sqsClient.sendMessage(
            {
              organizationId,
              repoId,
              orgName,
              createdAt,
              artifactDownloadUrl,
            },
            Queue.qGhWorkbreakdownV2.queueUrl,
            { requestId }
          );
          break;
        default:
          break;
      }
    })
  );
}
export async function completedWorkflowHandler(
  workflowRunData: Github.ExternalType.Webhook.WorkflowRunCompleted,
  requestId: string
): Promise<void> {
  try {
    const prId = Number(workflowRunData.pull_request.number);
    // Get the info of PR and check if it is merged
    const [prInfo] = await getPullRequestById(prId);
    if (prInfo && prInfo.merged) {
      // Get the info of the workflow run and update the prData
      const {
        organization: { login: orgName },
        repository: { name: repoName },
        workflow_run: { id: workflowRunId },
      } = workflowRunData;
      const installationAccessToken = await getInstallationAccessToken(orgName);
      const octokit = ghRequest.request.defaults({
        headers: {
          Authorization: `Bearer ${installationAccessToken.body.token}`,
        },
      });
      const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);

      const artifactsResponse = (await octokitRequestWithTimeout(
        `GET /repos/${orgName}/${repoName}/actions/runs/${workflowRunId}/artifacts`
      )) as OctokitResponse<{ artifacts: WorkflowArtifact[] }>;

      logger.info({
        requestId,
        message: 'Workflow artifacts fetched successfully',
        data: { artifacts: artifactsResponse.data.artifacts.length },
      });
      await processArtifact(workflowRunData, artifactsResponse.data.artifacts, requestId);
    } else {
      logger.error({
        requestId,
        message: 'completedWorkflowHandler.error',
        data: { isMerged: prInfo?.merged, workflowRunData },
      });
    }
  } catch (error) {
    logger.error({ requestId, message: 'completedWorkflowHandler.error', data: { error } });
  }
}
