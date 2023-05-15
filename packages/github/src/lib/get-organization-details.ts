import { organizationFormator } from '../util/organization-formatter';
import { RequestInterface } from '@octokit/types';
import { ElasticClient, ddbDocClient, logger } from 'core';
import { region } from 'src/constant/config';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';
import { Github } from 'pulse-abstraction';
import { ddbGlobalIndex } from 'pulse-abstraction/other/type';

export async function getOrganizationDetails(
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
    let responseData;
    responseData = await octokit(`GET /orgs/${organizationName}`);
    if (responseData?.data) {
      const getParams = {
        TableName: Table.GithubMapping.tableName,
        Key: {
          IndexName: ddbGlobalIndex.GitHubIdIndex,
          KeyConditionExpression: 'githubId = :githubId',
          ExpressionAttributeValues: {
            ':githubId': `gh_org_${responseData.data.id}`,
          },
        },
      };
      const ddbRes = await ddbDocClient(region as string).send(
        new GetCommand(getParams)
      );
      logger.info(ddbRes);
      const result = await organizationFormator(
        responseData.data,
        ddbRes.Item?.parentId
      );
      logger.info(result);
      if (!ddbRes.Item) {
        logger.info('---NEW_RECORD_FOUND---');
        const putParams = {
          TableName: Table.GithubMapping.tableName,
          Item: {
            parentId: result.id,
            githubId: result.body.id,
          },
        };
        logger.info('DYNAMODB_PUT_PARAM_DATA', { data: putParams });
        await ddbDocClient(region as string).send(new PutCommand(putParams));
      }
      await ElasticClient.saveOrUpdateDocument(
        Github.Enums.IndexName.GitOrganization,
        result
      );
    }
    logger.info('getOrganizationDetails.successfull', {
      response: responseData?.data,
    });
    return {
      name: responseData?.data?.name,
    };
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
