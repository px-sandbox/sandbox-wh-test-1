import { RequestInterface } from '@octokit/types';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { Github } from 'abstraction';
import { ElasticClient, logger, updateTable } from 'core';
import { ParamsMapping } from 'model/params-mapping';
import { region } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { organizationFormator } from '../util/organization-formatter';

export async function fetchAndSaveOrganizationDetails(
  octokit: RequestInterface<
    object & {
      headers: {
        authorization: string | undefined;
      };
    }
  >,
  organizationName: string
): Promise<{ name: string }> {
  try {
    logger.info('getOrganizationDetails.invoked');
    const responseData = await octokit(`GET /orgs/${organizationName}`);
    const orgId = `gh_org_${responseData.data.id}`;
    if (responseData?.data) {
      const { Items } = await new DynamoDbDocClient(region, Config.STAGE).find(
        new ParamsMapping().prepareGetParams(orgId)
      );
      const result = await organizationFormator(responseData.data, Items?.parentId);
      if (!Items) {
        logger.info('---NEW_RECORD_FOUND---');
        await updateTable(result);
      }
      await ElasticClient.saveOrUpdateDocument(Github.Enums.IndexName.GitOrganization, result);
    }
    logger.info('getOrganizationDetails.successfull', {
      response: responseData?.data,
    });
    return responseData?.data?.login;
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
