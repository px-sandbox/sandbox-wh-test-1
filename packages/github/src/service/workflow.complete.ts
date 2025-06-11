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
      const workflowRunId = workflowRunData.workflow_run.id;
      const repoOwner = workflowRunData.organization.login;
      const repoName = workflowRunData.repository.name;

      const installationAccessToken = await getInstallationAccessToken(repoOwner);
      const octokit = ghRequest.request.defaults({
        headers: {
          Authorization: `Bearer ${installationAccessToken.body.token}`,
        },
      });
      const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);

      const artifactsResponse = (await octokitRequestWithTimeout(
        `GET /repos/${repoOwner}/${repoName}/actions/runs/${workflowRunId}/artifacts`
      )) as OctokitResponse<{ artifacts: WorkflowArtifact[] }>;

      logger.info({
        requestId,
        message: 'Workflow artifacts fetched successfully',
        data: { artifacts: artifactsResponse.data.artifacts.length },
      });
      await Promise.all(
        artifactsResponse.data.artifacts.map(async (artifact) => {
          // switch case for the workflowActionName
          switch (artifact.name) {
            case Github.Enums.WorkflowAction.PulseVersionUpgradesReport:
              // call the queue to process the artifact
              await sqsClient.sendMessage(
                {
                  organizationId: workflowRunData.organization.id,
                  orgName: workflowRunData.organization.login,
                  repoId: workflowRunData.repository.id,
                  branch: workflowRunData.pull_request.head.ref,
                  artifactDownloadUrl: artifact.archive_download_url,
                },
                Queue.qRepoLibS3V2.queueUrl,
                { requestId }
              );
              break;
            case Github.Enums.WorkflowAction.PulseSecurityErrorsReport:
              await sqsClient.sendMessage(
                {
                  organizationId: workflowRunData.organization.id,
                  orgName: workflowRunData.organization.login,
                  repoId: workflowRunData.repository.id,
                  branch: workflowRunData.pull_request.head.ref,
                  artifactDownloadUrl: artifact.archive_download_url,
                },
                Queue.qGhRepoSastErrorV2.queueUrl,
                { requestId }
              );
              break;
            case Github.Enums.WorkflowAction.PulseTestCaseCoverageReport:
              await sqsClient.sendMessage(
                {
                  organizationId: workflowRunData.organization.id,
                  repoId: workflowRunData.repository.id,
                  createdAt: artifact.created_at,
                  artifactDownloadUrl: artifact.archive_download_url,
                },
                Queue.qGhTestCoverageV2.queueUrl,
                { requestId }
              );
              break;
            case Github.Enums.WorkflowAction.PulseWorkBreakdownReport:
              await sqsClient.sendMessage(
                {
                  organizationId: workflowRunData.organization.id,
                  repoId: workflowRunData.repository.id,
                  createdAt: artifact.created_at,
                  artifactDownloadUrl: artifact.archive_download_url,
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
