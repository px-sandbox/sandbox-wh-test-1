import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import axios from 'axios';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { esResponseDataFormator } from '../../util/es-response-formatter';
import { JiraCredsMapping } from '../model/prepare-creds-params';
import { getTokens } from './getToken';

export class JiraClient {
  private baseUrl: string;

  private constructor(
    // api parameters
    private cloudId: string,
    private accessToken: string,
    private refreshToken: string
  ) {
    this.baseUrl = `https://api.atlassian.com/ex/jira/${this.cloudId}`;
  }

  public static async getClient(orgName: string): Promise<JiraClient> {
    // clients creation
    const _esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    const _ddbClient = new DynamoDbDocClient();

    // get organisation from elasticsearch
    const organization = await _esClient.search(Jira.Enums.IndexName.Organization, 'name', orgName);
    const [orgId] = await esResponseDataFormator(organization);
    if (!organization) {
      throw new Error(`Organization ${orgName} not found`);
    }

    // get creds for this organisation
    const creds = await _ddbClient.find(new JiraCredsMapping().prepareGetParams(orgId.credId));

    if (!creds) {
      throw new Error(`Credential for given Organisation ${orgName} is not found`);
    }

    const { refresh_token: refreshToken } = creds as Jira.ExternalType.Api.Credentials;

    const { access_token: accessToken } = await getTokens(refreshToken);

    const instance = new JiraClient(orgId.orgId, accessToken, refreshToken);

    return instance;
  }

  public async getProjects() {}

  public async getBoards(boardId: number) {
    try {
      const token = this.accessToken;
      return axios.get(`${this.baseUrl}/rest/agile/1.0/board/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      logger.error({ message: 'JIRA_USER_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getSprints(boardId: string) {}

  public async getIssues() {}
}
