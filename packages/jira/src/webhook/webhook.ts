import { APIGatewayProxyEvent } from 'aws-lambda';
import moment from 'moment';
import { logger } from 'core';
import { Jira } from 'abstraction';

export async function handler(event: APIGatewayProxyEvent): Promise<void> {
  try {
    logger.info('webhook.handler.invoked', { event });
    const { organisation } = event.queryStringParameters as { organisation: string };
    const body: Jira.Types.Webhook | undefined = event.body ? JSON.parse(event.body) : undefined;

    if (!organisation || !body) {
      logger.info('webhook.handler.returnWithoutProcessing', { organisation, body });
      return;
    }

    logger.info('webhook.handler.received', { organisation, body });

    const eventTime = moment(body.timestamp);
    logger.info('webhook.handler.eventTime', { eventTime });
    const eventName = body.webhookEvent as Jira.Enums.events;

    switch (eventName) {
      case Jira.Enums.events.ProjectCreated:
        // do stuff for saving
        break;
      case Jira.Enums.events.ProjectUpdated:
        // do project update
        break;
      case Jira.Enums.events.ProjectSoftDeleted:
        // do soft delete project
        break;

      default:
      // unknown event or unimplemented event
    }
  } catch (error) {
    logger.error('webhook.handler.error', { error, event });
  }
}
