import Url from 'url';
import { Config } from 'sst/node/config';
import axios from 'axios';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ParamsMapping } from 'src/model/prepare-params';
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

  public static async getClient(
    orgName: string //   : Promise<JiraClient>
  ) {
    // clients creation
    const _esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    const _ddbClient = new DynamoDbDocClient();

    // get organisation from elasticsearch
    const [organisation]: Array<Jira.Types.Organization> = await _esClient.search(
      Jira.Enums.IndexName.Organisation,
      'organisations',
      orgName
    );

    if (!organisation) {
      throw new Error(`Organisation ${orgName} not found`);
    }

    // get creds for this organisation
    const creds = await _ddbClient.find(
      new ParamsMapping().prepareGetParams(organisation.body.credId)
    );

    if (!creds) {
      throw new Error(`Credential for given Organisation ${orgName} is not found`);
    }

    const { refresh_token: refreshToken } = creds.tokenObj;

    const { access_token: accessToken } = await getTokens(refreshToken);

    const instance = new JiraClient(organisation.body.orgId, accessToken, refreshToken);

    return instance;
  }

  public async getProjects() {}

  public async getBoards() {}

  public async getSprints(boardId: string) {}

  public async getIssues() {}
}
