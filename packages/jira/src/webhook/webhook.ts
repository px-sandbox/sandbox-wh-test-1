/* eslint-disable complexity */
/* eslint-disable complexity */
import { APIGatewayProxyEvent } from 'aws-lambda';
import moment from 'moment';
import { logger } from 'core';
import { Jira } from 'abstraction';
import * as user from './users';
import * as project from './projects';
import * as sprint from './sprints';


/**
 * Processes the webhook event based on the event name and performs the corresponding action.
 * @param eventName - The name of the event.
 * @param eventTime - The time when the event occurred.
 * @param body - The webhook payload.
 * @param organization - The name of the organization.
 * @returns A Promise that resolves when the event is processed.
 */
async function processWebhookEvent(
  eventName: Jira.Enums.Event,
  eventTime: moment.Moment,
  body: Jira.Type.Webhook,
  organization: string
): Promise<void> {
  let projectBody: Jira.ExternalType.Webhook.Project;
  switch (eventName?.toLowerCase()) {
    case Jira.Enums.Event.ProjectCreated:
      await project.create(body.project);
      break;
    case Jira.Enums.Event.ProjectUpdated:
      projectBody = {...(body.project), updatedAt: eventTime.format('YYYY-MM-DD HH:mm:ss')};
      await project.update(projectBody);
      projectBody = {...(body.project), updatedAt: eventTime.format('YYYY-MM-DD HH:mm:ss')};
      await project.update(projectBody);
      break;
    case Jira.Enums.Event.ProjectSoftDeleted:
      projectBody = {...(body.project), deletedAt: eventTime.format('YYYY-MM-DD HH:mm:ss'), isDeleted: true};
      await project.delete(projectBody);
      break;
    case Jira.Enums.Event.ProjectRestoreDeleted:
      projectBody = {...(body.project), isDeleted: false};
      await project.restoreDeleted(projectBody);
    break;
    case Jira.Enums.Event.UserCreated:
      await user.create(body.user);
      break;
    case Jira.Enums.Event.UserUpdated:
      await user.update(body.user);
      break;
    case Jira.Enums.Event.UserDeleted:
      await user.deleted(body.accountId, eventTime);
      break;
    case Jira.Enums.Event.SprintCreated:
      await sprint.createSprintEvent(body.sprint, organization);
      break;
    case Jira.Enums.Event.SprintStarted:
      await sprint.startSprintEvent(body.sprint, organization);
      break;
    case Jira.Enums.Event.SprintUpdated:
      await sprint.updateSprintEvent(body.sprint, organization);
      break;
    case Jira.Enums.Event.SprintDeleted:
      await sprint.deleteSprintEvent(body.sprint, organization);
      break;
    case Jira.Enums.Event.SprintClosed:
      await sprint.closeSprintEvent(body.sprint, organization);
      break;
    default:
      logger.info(`No case found for ${eventName} in Jira webhook event`);
      break;
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
