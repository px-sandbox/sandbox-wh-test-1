import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { MigrationStatus, mappingPrefixes } from 'src/constant/config';
import { ParamsMapping } from 'src/model/params-mapping';
import { Organization } from 'src/processors/organization';
import { getOauthCode } from 'src/util/jwt-token';
import { ghRequest } from './request-default';
import { getOctokitTimeoutReqFn } from 'src/util/octokit-timeout-fn';
import { collectData } from 'src/service/history-data';
import { v4 as uuid } from 'uuid';
const esClientObj = ElasticSearchClient.getInstance();
const dynamodbClient = DynamoDbDocClient.getInstance();

function formatMigrationStatus(orgId: number) {
  return {
    id: uuid(),
    body: {
      organizationId: `${mappingPrefixes.organization}_${orgId}`,
      statusLogs: {
        status: MigrationStatus.IN_PROGRESS,
        date: new Date().toISOString(),
      },
    },
  };
}
export async function orgInstallation(
  data: Github.ExternalType.Webhook.Installation,
  requestId: string
): Promise<void> {
  logger.info({
    message: 'INSTALLATION_CREATED',
    requestId,
  });
  try {
    logger.info({
      message: 'create.installation.invoked',
      requestId,
      data: JSON.stringify(data),
    });
    const {
      body: { token },
    } = await getOauthCode();

    const octokit = ghRequest.request.defaults({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
    const installation = await octokitRequestWithTimeout('GET /app/installations');
    logger.info({
      message: 'installation',
      data: JSON.stringify(installation),
      requestId,
    });

    const [installationData] = installation.data.filter(
      (name: any) => data.installation.account.login === name.account.login
    );

    const orgId = `${mappingPrefixes.organization}_${data.installation.account.id}`;
    const records = await dynamodbClient.find(new ParamsMapping().prepareGetParams(orgId));
    const result = new Organization({ ...data, installationData }, requestId, orgId).validate();
    if (result) {
      const formattedData = await result.processor(records?.parentId as string);
      if (records === undefined) {
        await dynamodbClient.put(
          new ParamsMapping().preparePutParams(formattedData.id, formattedData.body.id)
        );
      }
      // create entry in elasticsearch for organization
      await esClientObj.putDocument(Github.Enums.IndexName.GitOrganization, formattedData);
      // create entry in elasticsearch for migration status
      const migrationStatus = formatMigrationStatus(formattedData.body.githubOrganizationId);
      await esClientObj.putDocument(Github.Enums.IndexName.GitMigrationStatus, migrationStatus);
      //trigger migration
      await collectData(formattedData.body.name, { requestId, resourceId: formattedData.body.id });
    }
  } catch (error: unknown) {
    logger.error({ message: 'create.installation.error', error, requestId });
    throw error;
  }
}
