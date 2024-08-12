import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import esb from 'elastic-builder';
import { MigrationStatus } from 'src/constant/config';
import { migrationStatusSchema } from './validations';

const esClient = ElasticSearchClient.getInstance();

const migration = async function setStatus(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const status = event.queryStringParameters?.status || MigrationStatus.IN_PROGRESS;
  const orgId = event.queryStringParameters?.orgId || '';
  try {
    const matchQry = esb
      .requestBodySearch()
      .query(esb.matchQuery('body.organizationId', orgId))
      .toJSON();
    const time = new Date().toISOString();
    const script = esb
      .script(
        'inline',
        `if (ctx._source.body.statusLogs instanceof Map) {
        ctx._source.body.statusLogs = [ctx._source.body.statusLogs];
      }
      ctx._source.body.statusLogs.add(params.newStatusLog);`
      )
      .params({ newStatusLog: { status: status, time: time } });

    await esClient.updateByQuery(
      Github.Enums.IndexName.GitMigrationStatus,
      matchQry,
      script.toJSON()
    );
    return responseParser
      .setBody({})
      .setMessage('Migration Status updated successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    return responseParser
      .setBody({})
      .setMessage('Error while updating migration status')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('FAILED')
      .send();
  }
};

const handler = APIHandler(migration, {
  eventSchema: transpileSchema(migrationStatusSchema),
});
export { handler, migration };
