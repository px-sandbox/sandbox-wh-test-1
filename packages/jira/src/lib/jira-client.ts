import { DynamoDbDocClient } from '@pulse/dynamodb';
import { Config } from 'sst/node/config';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import axios from 'axios';
import { logger } from 'core';
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
    if (!organization) {
      throw new Error(`Organization ${orgName} not found`);
    }

    const [orgId] = await esResponseDataFormator(organization);

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

  public async getProject(projectId: string): Promise<Jira.ExternalType.Api.Project> {
    const { data: project } = await axios.get<Jira.ExternalType.Api.Project>(
      `${this.baseUrl}/rest/api/2/project/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    return project;
  }

  public async getBoard(boardId: number): Promise<Jira.ExternalType.Api.Board> {
    try {
      const token = this.accessToken;
      const { data: board } = await axios.get<Jira.ExternalType.Api.Board>(
        `${this.baseUrl}/rest/agile/1.0/board/${boardId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return board;
    } catch (error) {
      logger.error({ message: 'JIRA_BOARD_FETCH_FAILED', error });
      throw error;
    }
  }
  public async getBoards(projectId: string): Promise<Jira.ExternalType.Api.Board[]> {
    const { values: boards } = await this.paginateResults<Jira.ExternalType.Api.Board>(
      `/rest/agile/1.0/board`,
      {
        projectKeyOrId: projectId,
      }
    );

    return boards;
  }

  public async getBoardConfig(boardId: number): Promise<Jira.ExternalType.Api.BoardConfig> {
    try {
      const token = this.accessToken;
      const { data: boardConfig } = await axios.get<Jira.ExternalType.Api.BoardConfig>(
        `${this.baseUrl}/rest/agile/1.0/board/${boardId}/configuration`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return boardConfig;
    } catch (error) {
      logger.error({ message: 'JIRA_BOARD_CONFIG_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getSprints(boardId: string) {
    const { values: sprints } = await this.paginateResults<Jira.ExternalType.Api.Sprint>(
      `/rest/agile/1.0/board/${boardId}/sprint`
    );

    return sprints;
  }

  public async getProjects() {
    const { values: projects } = await this.paginateResults<Jira.ExternalType.Api.Project>(
      `/rest/api/2/project/search`
    );

    return projects;
  }

  public async getUser(userAccountId: string): Promise<Jira.ExternalType.Api.User> {
    try {
      const token = this.accessToken;
      const { data: user } = await axios.get<Jira.ExternalType.Api.User>(
        `${this.baseUrl}/rest/api/2/user?accountId=${userAccountId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return user;
    } catch (error) {
      logger.error({ message: 'JIRA_USER_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getUsers(): Promise<Jira.ExternalType.Api.User[]> {
    const { values: users } = await this.paginateResults<Jira.ExternalType.Api.User>(
      `/rest/api/2/users/search`
    );

    return users;
  }

  public async getIssues() {}

  public async getIssue(issueIdOrKey: string) {
    try {
      const issue = await axios.get<Jira.ExternalType.Api.Issue>(
        `${this.baseUrl}/rest/agile/1.0/issue/${issueIdOrKey}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      return issue.data;
    } catch (error) {
      logger.error({ message: 'JIRA_ISSUE_FETCH_FAILED', error });
      throw error;
    }

    // try{
    //   const {values: issue}  = await this.paginateResults<Jira.ExternalType.Api.Issue>(`/rest/agile/1.0/issue/${issueIdOrKey}`)
    //   console.log("ISSUE", issue);
    //   return [issue];
    //   }catch(error){
    //     logger.error({ message: 'JIRA_ISSUE_FETCH_FAILED', error });
    //     throw error;
    //   }
  }

  private async paginateResults<T>(
    path: string,
    queue: Record<string, string | number> = {},
    result: Jira.ExternalType.Api.Response<T> = {
      startAt: 0,
      isLast: false,
      maxResults: 50,
      total: 0,
      values: [],
    }
  ): Promise<Jira.ExternalType.Api.Response<T>> {
    const { data } = await axios.get<Jira.ExternalType.Api.Response<T>>(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        ...queue,
        startAt: result.startAt,
        maxResults: result.maxResults,
      },
    });
    result.values = [...result.values, ...data.values];
    result.startAt += result.values.length;
    result.isLast = data.isLast;

    if (result.isLast) {
      return result;
    }

    return this.paginateResults<T>(path, queue, result);
  }
}
