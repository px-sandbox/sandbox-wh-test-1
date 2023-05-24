import { RequestInterface } from '@octokit/types';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { Github } from 'abstraction';
import { ElasticClient, logger, updateTable } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { region } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { organizationFormator } from '../util/organization-formatter';
import { ElasticSearchClient } from '@pulse/elasticsearch';

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
    const records = await new DynamoDbDocClient(region, Config.STAGES).find(
      new ParamsMapping().prepareGetParams(orgId)
    );
    if (responseData?.data) {
      const result = await organizationFormator(responseData.data, records?.parentId);
      if (records === undefined) {
        logger.info('---NEW_RECORD_FOUND---');
        await new DynamoDbDocClient(region, Config.STAGES).put(
          new ParamsMapping().preparePutParams(result.id, result.body.id)
        );
      }
      await new ElasticSearchClient().putDocument(Github.Enums.IndexName.GitOrganization, result);
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
