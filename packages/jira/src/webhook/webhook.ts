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
  organization: string
): Promise<void> {
  try {
    const event = eventName?.toLowerCase();
    switch (event) {
      case Jira.Enums.Event.ProjectCreated:
        await project.create(body.project, eventTime, organization);
        break;
      case Jira.Enums.Event.ProjectUpdated:
        await project.update(body.project, eventTime, organization);
        break;
      case Jira.Enums.Event.ProjectSoftDeleted:
        await project.delete(body.project.id, eventTime, organization);
        break;
      case Jira.Enums.Event.ProjectRestoreDeleted:
        await project.restoreDeleted(body.project.id, eventTime, organization);
        break;
      case Jira.Enums.Event.UserCreated:
        await user.create(body.user, eventTime, organization);
        break;
      case Jira.Enums.Event.UserUpdated:
        await user.update(body.user, organization);
        break;
      case Jira.Enums.Event.UserDeleted:
        await user.deleted(body.accountId, eventTime, organization);
        break;
      case Jira.Enums.Event.SprintCreated:
        await sprint.create(body.sprint, organization);
        break;
      case Jira.Enums.Event.SprintStarted:
        await sprint.start(body.sprint, organization);
        break;
      case Jira.Enums.Event.SprintUpdated:
        await sprint.update(body.sprint, organization);
        break;
      case Jira.Enums.Event.SprintDeleted:
        await sprint.delete(body.sprint, eventTime, organization);
        break;
      case Jira.Enums.Event.SprintClosed:
        await sprint.close(body.sprint, organization);
        break;
      case Jira.Enums.Event.BoardCreated:
        await board.create(body.board, eventTime, organization);
        break;
      case Jira.Enums.Event.BoardConfigUpdated:
        await board.updateConfig(body.configuration, organization);
        break;
      case Jira.Enums.Event.BoardUpdated:
        await board.update(body.board, organization);
        break;
      case Jira.Enums.Event.BoardDeleted:
        await board.delete(body.board.id, eventTime, organization);
        break;
      case Jira.Enums.Event.IssueCreated:
        await issue.create({
          issue: body.issue,
          changelog: body.changelog,
          organization,
          eventName,
        });
        break;
      case Jira.Enums.Event.IssueUpdated:
        await issue.update({
          issue: body.issue,
          changelog: body.changelog,
          organization,
          eventName,
        });
        break;
      case Jira.Enums.Event.IssueDeleted:
        await issue.remove(body.issue.id, eventTime, organization);
        await removeReopenRate(
          {
            issue: body.issue,
            changelog: body.changelog,
            organization,
          } as Jira.Mapped.ReopenRateIssue,
          eventTime
        );
        break;
      case Jira.Enums.Event.WorklogCreated:
      case Jira.Enums.Event.WorklogUpdated:
      case Jira.Enums.Event.WorklogDeleted:
        await issue.worklog(body.worklog.issueId, organization);
        break;
      default:
        logger.info(`No case found for ${eventName} in Jira webhook event`);
        break;
    }
  } catch (error) {
    logger.error('webhook.handler.processWebhookEvent.error', {
      error,
      eventName,
      eventTime,
      body,
      organization,
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
  try {
    logger.info('webhook.handler.invoked', { event });
    const { organization } = event.queryStringParameters as { organization: string };
    const body: Jira.Type.Webhook | undefined = event.body ? JSON.parse(event.body) : undefined;

    if (!organization || !body) {
      logger.info('webhook.handler.returnWithoutProcessing', { organization, body });
      return;
    }

    logger.info('webhook.handler.received', { organization, body });

    const eventTime = moment(body.timestamp);
    logger.info('webhook.handler.eventTime', { eventTime });

    const eventName = body.webhookEvent as Jira.Enums.Event;
    await processWebhookEvent(eventName, eventTime, body, organization);
  } catch (error) {
    logger.error('webhook.handler.error', { error, event });
  }
}
