/* eslint-disable complexity */
import { APIGatewayProxyEvent } from 'aws-lambda';
import moment from 'moment';
import { logger } from 'core';
import { Jira } from 'abstraction';

import * as user from './users';
import * as project from './projects';
import * as sprint from './sprints';
import * as board from './boards';
import * as issue from './issues';
import { removeReopenRate } from './issues/delete-reopen-rate';

/**
 * Processes the webhook event based on the event name and performs the corresponding action.
 * @param eventName - The name of the event.
 * @param eventTime - The time when the event occurred.
 * @param body - The webhook payload.
 * @param organization - The name of the organization.
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
        await issue.create(
          {
            issue: body.issue,
            changelog: body.changelog,
            organization,
            eventName,
          },
          requestId
        );
        break;
      case Jira.Enums.Event.IssueUpdated:
        await issue.update(
          {
            issue: body.issue,
            changelog: body.changelog,
            organization,
            eventName,
          },
          requestId
        );
        break;
      case Jira.Enums.Event.IssueDeleted:
        await issue.remove(
          body.issue.id,
          eventTime,
          organization,
          requestId,
          body.issue.fields?.parent?.id
        );
        await removeReopenRate(
          {
            issue: body.issue,
            changelog: body.changelog,
            organization,
          } as Jira.Mapped.ReopenRateIssue,
          eventTime,
          requestId
        );
        break;
      case Jira.Enums.Event.WorklogCreated:
      case Jira.Enums.Event.WorklogUpdated:
      case Jira.Enums.Event.WorklogDeleted:
        await issue.worklog(body.worklog.issueId, organization, requestId);
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

    logger.info({
      requestId,
      message: 'webhook.handler.received',
      data: { organization, body },
      resourceId,
    });

    const eventTime = moment(body.timestamp);

    logger.info({
      requestId,
      message: 'webhook.handler.processing',
      data: { eventTime },
      resourceId,
    });

    const eventName = body.webhookEvent as Jira.Enums.Event;
    await processWebhookEvent(eventName, eventTime, body, organization, requestId, resourceId);
  } catch (error) {
    logger.error({
      requestId,
      message: 'webhook.handler.error',
      data: `${error}_${event}`,
      resourceId,
    });
  }
}
