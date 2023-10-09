import { DynamoDbDocClient } from '@pulse/dynamodb';
import { Config } from 'sst/node/config';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import axios from 'axios';
import { logger } from 'core';
import { esResponseDataFormator } from '../util/es-response-formatter';
import { JiraCredsMapping } from '../model/prepare-creds-params';
import { getTokens } from './get-token';

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

  /**
   * Returns a JiraClient instance for the given organization name.
   * @param orgName - The name of the organization.
   * @returns A Promise that resolves to a JiraClient instance.
   * @throws An error if the organization or its credentials are not found.
   */
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
    const creds = await _ddbClient.find(new JiraCredsMapping().prepareGetParams(orgId.credId)) as any;

    if (!creds) {
      throw new Error(`Credential for given Organisation ${orgName} is not found`);
    }

    const { refresh_token: refreshToken, access_token: accessToken } = creds as Jira.ExternalType.Api.Credentials;

    const instance = new JiraClient(orgId.orgId, accessToken, refreshToken);
    return instance;
  }

  /**
   * Retrieves a Jira project by its ID.
   * @param projectId - The ID of the project to retrieve.
   * @returns A Promise that resolves with the retrieved project.
   */
  public async getProject(projectId: string): Promise<Jira.ExternalType.Api.Project> {
    const { data: project } = await axios.get<Jira.ExternalType.Api.Project>(
      `${this.baseUrl}/rest/api/3/project/${projectId}`,
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
      const { data: boardConfig } = await axios.get<Jira.ExternalType.Api.BoardConfig>(
        `${this.baseUrl}/rest/agile/1.0/board/${boardId}/configuration`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      return boardConfig;
    } catch (error) {
      logger.error({ message: 'JIRA_BOARD_CONFIG_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getSprints(boardId: string): Promise<Jira.ExternalType.Api.Sprint[]> {
    const { values: sprints } = await this.paginateResults<Jira.ExternalType.Api.Sprint>(
      `/rest/agile/1.0/board/${boardId}/sprint`
    );

    return sprints;
  }

  /**
   * Returns an array of Jira projects.
   * @returns {Promise<Jira.ExternalType.Api.Project[]>} A promise that resolves to an array of Jira projects.
   */
  public async getProjects(): Promise<Jira.ExternalType.Api.Project[]> {
    const { values: projects } = await this.paginateResults<Jira.ExternalType.Api.Project>(
      `/rest/api/3/project/search`
    );

    return projects;
  }

  public async getUser(userAccountId: string): Promise<Jira.ExternalType.Api.User> {
    try {
      const token = this.accessToken;
      const { data: user } = await axios.get<Jira.ExternalType.Api.User>(
        `${this.baseUrl}/rest/api/3/user?accountId=${userAccountId}`,
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
    const users = await this.paginateResultsForUsers<Jira.ExternalType.Api.User>(
      `/rest/api/3/users/search`
    );

    return users;
  }

  public async getIssue(issueIdOrKey: string): Promise<Jira.ExternalType.Api.Issue> {
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
  }

  public async getIssues(boardId: string, sprintId: string) {
    const { issues } = await this.paginateResultsForIssues<Jira.ExternalType.Api.Issue>(
      `/rest/agile/1.0/board/${boardId}/sprint/${sprintId}/issue`
    );

    return issues;
  }

  private async paginateResults<T>(
    path: string,
    query: Record<string, string | number> = {},
    result: Jira.ExternalType.Api.Response<T> = {
      startAt: 0,
      maxResults: 50,
      isLast: false,
      total: 0,
      values: [],
    }
  ): Promise<Jira.ExternalType.Api.Response<T>> {


    console.log(`
    ################## ALL ${path}
    
    startAt: ${result.startAt}
    maxResults: ${result.maxResults}
    total: ${result.total}
    
    ##################
    `)


    const { data } = await axios.get<Jira.ExternalType.Api.Response<T>>(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        ...query,
        startAt: result.startAt,
        maxResults: result.maxResults,
      },
    });

    const newResult = {
      values: result.values.concat(data.values),
      startAt: data.startAt + data.values.length,
      isLast: data.isLast,
      maxResults: data.maxResults,
      total: data.total,
    };


    if (data.isLast) {
      return newResult;
    }

    return this.paginateResults<T>(path, query, newResult);
  }

  private async paginateResultsForIssues<T>(
    path: string,
    query: Record<string, string | number> = {},
    result: Jira.ExternalType.Api.IssuesResponse<T> = {
      startAt: 0,
      maxResults: 50,
      total: 0,
      issues: [],
    }
  ): Promise<Jira.ExternalType.Api.IssuesResponse<T>> {
    const { data } = await axios.get<Jira.ExternalType.Api.IssuesResponse<T>>(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        ...query,
        startAt: result.startAt,
        maxResults: result.maxResults,
      },
    });

    const newResult = {
      ...result,
      issues: [...result.issues, ...data.issues],
      startAt: data.startAt + result.issues.length,
      maxResults: data.maxResults,
      total: data.total,
    };

    console.log(`
    ################## ${path}
    
    startAt: ${newResult.startAt}
    maxResults: ${newResult.maxResults}
    total: ${newResult.issues.length}
    
    ##################
    `)

    if (newResult.startAt >= newResult.total) {
      return newResult;
    }

    return this.paginateResultsForIssues<T>(path, query, newResult);
  }

  private async paginateResultsForUsers<T>(
    path: string,
    startAt: number = 0,
    maxResults: number = 50,
    users: Array<T> = []
  ): Promise<Array<T>> {

    console.log(`
    ################## ${path}
    
    startAt: ${startAt}
    maxResults: ${maxResults}
    total: ${users.length}
    
    ##################
    `)

    const { data } = await axios.get<Array<T>>(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        startAt,
        maxResults,
      },
    });

    users = users.concat(data);
    startAt += data.length;


    if (data.length === 0) {
      return users;
    }

    return this.paginateResultsForUsers<T>(path, startAt, maxResults, users);
  }
}
