import { APIGatewayProxyEvent } from 'aws-lambda';
import moment from 'moment';
import { logger } from 'core';
import { Jira } from 'abstraction';
import * as user from './users';

import * as sprint from './sprints';

async function processWebhookEvent(
  eventName: Jira.Enums.Event,
  eventTime: moment.Moment,
  body: Jira.Type.Webhook,
  organization: string
): Promise<void> {
  switch (eventName?.toLowerCase()) {
    case Jira.Enums.Event.ProjectCreated:
      // do stuff for saving
      break;
    case Jira.Enums.Event.ProjectUpdated:
      // do project update
      break;
    case Jira.Enums.Event.ProjectSoftDeleted:
      // do soft delete project
      break;
    case Jira.Enums.Event.UserCreated:
      await user.create(body.user);
      break;
    case Jira.Enums.Event.UserUpdated:
      // do user update
      break;
    case Jira.Enums.Event.UserDeleted:
      // do soft delete user
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
