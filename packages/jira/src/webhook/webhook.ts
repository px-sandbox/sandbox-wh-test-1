/* eslint-disable complexity */
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';

import * as board from './boards';
import * as issue from './issues';
import * as project from './projects';
import * as sprint from './sprints';
import * as user from './users';
import { issueLinkHandler } from './issues/issue-links';

/**
 * Processes the webhook event based on the event name and performs the corresponding action.
 * @param eventName - The name of the event.
 * @param eventTime - The time when the event occurred.
 * @param body - The webhook payload.
 * @param organization - The name of the organization
 * @returns A Promise that resolves when the event is processed.
 */
// eslint-disable-next-line max-lines-per-function
async function processWebhookEvent(
  eventName: Jira.Enums.Event,
  eventTime: moment.Moment,
  body: Jira.Type.Webhook,
  organization: string,
  requestId: string,
  resourceId: string
): Promise<void> {
  try {
    const event = eventName?.toLowerCase();
    switch (event) {
      case Jira.Enums.Event.ProjectCreated:
        await project.create(body.project, eventTime, organization, requestId);
        break;
      case Jira.Enums.Event.ProjectUpdated:
        await project.update(body.project, eventTime, organization, requestId);
        break;
      case Jira.Enums.Event.ProjectSoftDeleted:
        await project.delete(body.project.id, eventTime, organization, requestId);
        break;
      case Jira.Enums.Event.ProjectRestoreDeleted:
        await project.restoreDeleted(body.project.id, eventTime, organization, requestId);
        break;
      case Jira.Enums.Event.UserCreated:
        await user.create(body.user, eventTime, organization, requestId);
        break;
      case Jira.Enums.Event.UserUpdated:
        await user.update(body.user, organization, requestId);
        break;
      case Jira.Enums.Event.UserDeleted:
        await user.deleted(body.accountId, eventTime, organization, requestId);
        break;
      case Jira.Enums.Event.SprintCreated:
        await sprint.create(body.sprint, organization, requestId);
        break;
      case Jira.Enums.Event.SprintStarted:
        await sprint.start(body.sprint, organization, requestId);
        break;
      case Jira.Enums.Event.SprintUpdated:
        await sprint.update(body.sprint, organization, requestId);
        break;
      case Jira.Enums.Event.SprintDeleted:
        await sprint.delete(body.sprint, eventTime, organization, requestId);
        break;
      case Jira.Enums.Event.SprintClosed:
        await sprint.close(body.sprint, organization, requestId);
        break;
      case Jira.Enums.Event.BoardCreated:
        await board.create(body.board, eventTime, organization, requestId);
        break;
      case Jira.Enums.Event.BoardConfigUpdated:
        await board.updateConfig(body.configuration, organization, requestId);
        break;
      case Jira.Enums.Event.BoardUpdated:
        await board.update(body.board, organization, requestId);
        break;
      case Jira.Enums.Event.BoardDeleted:
        await board.delete(body.board.id, eventTime, organization, requestId);
        break;
      case Jira.Enums.Event.IssueCreated:
      case Jira.Enums.Event.IssueUpdated:
      case Jira.Enums.Event.IssueDeleted:
        await issue.issueHandler(
          {
            issue: body.issue,
            changelog: body.changelog,
            organization,
            eventName,
            timestamp: eventTime.toISOString(),
          },
          requestId
        );
        break;
      case Jira.Enums.Event.WorklogCreated:
      case Jira.Enums.Event.WorklogUpdated:
      case Jira.Enums.Event.WorklogDeleted:
        await issue.worklog(body.worklog.issueId, eventName, organization, requestId);
        break;
      case Jira.Enums.Event.IssueLinkCreated:
      case Jira.Enums.Event.IssueLinkDeleted:
        logger.info({
          message: 'issueLinkHandler.webhookEvent',
          data: { eventName, organization, requestId },
        });
        await issueLinkHandler(body.issueLink, eventName, organization, requestId);
        break;
      default:
        logger.info({
          requestId,
          message: `No case found for ${eventName} in Jira webhook event`,
          resourceId,
        });
        break;
    }
  } catch (error) {
    logger.error({
      requestId,
      message: 'webhook.handler.processWebhookEvent.error',
      data: { error, eventName, eventTime, body, organization },
      resourceId,
    });
    throw error;
  }
}

/**
 * Handles the incoming webhook event from Jira.
 * @param event - The APIGatewayProxyEvent object containing the webhook event data.
 * @returns A Promise that resolves to void.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<void> {
  const { requestId } = event.requestContext;
  const { organization } = event.queryStringParameters as { organization: string };
  const body: Jira.Type.Webhook | undefined = event.body ? JSON.parse(event.body) : undefined;
  const resourceId =
    body?.issue?.id ||
    body?.board?.id ||
    body?.project?.id ||
    body?.sprint?.id ||
    body?.configuration?.id ||
    '';
  try {
    logger.info({
      requestId,
      resourceId,
      message: 'webhook.handler.invoked',
    });

    if (!organization || !body) {
      logger.warn({
        requestId,
        message: 'webhook.handler.returnWithoutProcessing',
        data: { organization, body },
        resourceId,
      });
      return;
    }

    const eventTime = moment(body.timestamp);
    const eventName = body.webhookEvent as Jira.Enums.Event;

    logger.info({
      requestId,
      message: 'webhook.handler.processing',
      data: { organization, body, eventName, eventTime },
      resourceId,
    });

    await processWebhookEvent(eventName, eventTime, body, organization, requestId, resourceId);

    logger.info({
      requestId,
      message: 'webhook.handler.completed',
      data: { organization, body, eventName, eventTime },
      resourceId,
    });
  } catch (error) {
    logger.error({
      requestId,
      message: 'webhook.handler.error',
      data: `${error}_${event}`,
      resourceId,
    });
  }
}
