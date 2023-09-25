import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import axios, { AxiosStatic, AxiosResponse } from 'axios';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { ParamsMapping } from 'src/model/prepare-params';
import { Jira } from 'abstraction';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const code: string = event?.queryStringParameters?.code || '';

  const response = await axios.post('https://auth.atlassian.com/oauth/token', {
    grant_type: 'authorization_code',
    client_id: Config.JIRA_CLIENT_ID,
    client_secret: Config.JIRA_CLIENT_SECRET,
    code,
    redirect_uri: Config.JIRA_REDIRECT_URI,
  });

  const _esClient = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  });

  const _ddbClient = new DynamoDbDocClient();

  const credId = uuid();

  const accessibleOrgs: AxiosResponse<Array<Jira.ExternalType.Api.Organization>> = await axios.get(
    'https://api.atlassian.com/oauth/token/accessible-resources',
    {
      headers: {
        Authorization: `Bearer ${response.data.access_token}`,
        Accept: 'application/json',
      },
    }
  );

  await Promise.all([
    _ddbClient.put(new ParamsMapping().preparePutParams(credId, response.data)),
    ...accessibleOrgs.data.map(({ id, ...org }) =>
      _esClient.putDocument(Jira.Enums.IndexName.Organization, {
        id: uuid(),
        body: {
          id: `jira_org_${id}`,
          orgId: id,
          credId,
          createdAt: new Date(),
          ...org,
        },
      })
    ),
  ]);

  return responseParser
    .setBody({})
    .setMessage('Authentication Successfull')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
