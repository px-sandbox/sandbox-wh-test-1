import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import axios, { AxiosInstance } from 'axios';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { esResponseDataFormator } from '../util/es-response-formatter';
import { JiraCredsMapping } from '../model/prepare-creds-params';

export class JiraClient {
  private timeoutErrorMessage = 'Request to Jira API timed out';
  private timeout = parseInt(Config.REQUEST_TIMEOUT, 10);

  // made a private common axios instance to handle the requests
  private axiosInstance: AxiosInstance;

  private constructor(
    // api parameters
    private cloudId: string,
    private accessToken: string,
    private refreshToken: string
  ) {
    this.axiosInstance = axios.create({
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      baseURL: `https://api.atlassian.com/ex/jira/${this.cloudId}`,
      timeout: this.timeout ?? 2000,
      timeoutErrorMessage: this.timeoutErrorMessage ?? 'Request to Jira API timed out',
    });
  }

  /**
   * Returns a JiraClient instance for the given organization name.
   * @param orgName - The name of the organization.
   * @returns A Promise that resolves to a JiraClient instance.
   * @throws An error if the organization or its credentials are not found.
   */
  public static async getClient(orgName: string): Promise<JiraClient> {
    // clients creation
    const esClient = ElasticSearchClient.getInstance();
    const ddbClient = DynamoDbDocClient.getInstance();

    // get organisation from elasticsearch
    const query = esb.requestBodySearch().query(esb.termQuery('body.name', orgName)).toJSON();
    const organization = await esClient.search(Jira.Enums.IndexName.Organization, query);

    const [orgId] = await esResponseDataFormator(organization);

    if (!orgId) {
      throw new Error(`Organization ${orgName} not found`);
    }

    // get creds for this organisation
    const creds = await ddbClient.find(new JiraCredsMapping().prepareGetParams(orgId.credId));

    if (!creds) {
      throw new Error(`Credential for given Organisation ${orgName} is not found`);
    }

    const { refresh_token: refreshToken, access_token: accessToken } =
      creds as Jira.ExternalType.Api.Credentials;

    const instance = new JiraClient(orgId.orgId, accessToken, refreshToken);

    return instance;
  }

  /**
   * Retrieves a Jira project by its ID.
   * @param projectId - The ID of the project to retrieve.
   * @returns A Promise that resolves with the retrieved project.
   */
  public async getProject(projectId: string): Promise<Jira.ExternalType.Api.Project> {
    const { data: project } = await this.axiosInstance.get<Jira.ExternalType.Api.Project>(
      `/rest/api/3/project/${projectId}`
    );

    return project;
  }

  public async getBoard(boardId: number): Promise<Jira.ExternalType.Api.Board> {
    try {
      const { data: board } = await this.axiosInstance.get<Jira.ExternalType.Api.Board>(
        `/rest/agile/1.0/board/${boardId}`
      );

      return board;
    } catch (error) {
      logger.error({ message: 'JIRA_BOARD_FETCH_FAILED', error });
      throw error;
    }
  }
  public async getBoards(projectId: string): Promise<Jira.ExternalType.Api.Board[]> {
    const { values: boards } = await this.paginateResults<Jira.ExternalType.Api.Board>(
      '/rest/agile/1.0/board',
      {
        projectKeyOrId: projectId,
      }
    );

    return boards;
  }

  public async getSprint(sprintId: string): Promise<Jira.ExternalType.Api.Sprint> {
    const { data: sprint } = await this.axiosInstance.get<Jira.ExternalType.Api.Sprint>(
      `/rest/agile/1.0/sprint/${sprintId}`
    );

    return sprint;
  }

  public async getBoardConfig(boardId: number): Promise<Jira.ExternalType.Api.BoardConfig> {
    try {
      const { data: boardConfig } = await this.axiosInstance.get<Jira.ExternalType.Api.BoardConfig>(
        `/rest/agile/1.0/board/${boardId}/configuration`
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
      '/rest/api/3/project/search'
    );

    return projects;
  }

  public async getUser(userAccountId: string): Promise<Jira.ExternalType.Api.User> {
    try {
      const { data: user } = await this.axiosInstance.get<Jira.ExternalType.Api.User>(
        `/rest/api/3/user?accountId=${userAccountId}`
      );

      return user;
    } catch (error) {
      logger.error({ message: 'JIRA_USER_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getUsers(): Promise<Jira.ExternalType.Api.User[]> {
    const users = await this.paginateResultsForUsers<Jira.ExternalType.Api.User>(
      '/rest/api/3/users/search'
    );

    return users;
  }

  public async getIssueStatuses(): Promise<Jira.ExternalType.Api.IssueStatus[]> {
    try {
      const { values: statuses } =
        await this.paginateResultsForIssueStatuses<Jira.ExternalType.Api.IssueStatus>(
          '/rest/api/3/statuses/search'
        );
      return statuses;
    } catch (error) {
      logger.error({ message: 'JIRA_ISSUE_STATUS_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getIssue(issueIdOrKey: string): Promise<Jira.ExternalType.Api.Issue> {
    try {
      const issue = await this.axiosInstance.get<Jira.ExternalType.Api.Issue>(
        `/rest/agile/1.0/issue/${issueIdOrKey}`
      );
      return issue.data;
    } catch (error) {
      logger.error({ message: 'JIRA_ISSUE_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getIssues(sprintId: string): Promise<Jira.ExternalType.Api.Issue[]> {
    const { issues } = await this.paginateResultsForIssues<Jira.ExternalType.Api.Issue>(
      `/rest/agile/1.0/sprint/${sprintId}/issue`,
      {
        fields: `issuetype,priority,changelog,project,labels,
        assignee,reporter,creator,status,subtask,changelog,created,updated,lastViewed,sprint,closedSprints`,
      }
    );

    return issues;
  }

  public async getIssueChangelogs(issueId: string): Promise<Jira.ExternalType.Api.Changelogs[]> {
    const { values } = await this.paginateResults<Jira.ExternalType.Api.Changelogs>(
      `/rest/api/2/issue/${issueId}/changelog`
    );
    return values;
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
    const { data } = await this.axiosInstance.get<Jira.ExternalType.Api.Response<T>>(path, {
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
    const { data } = await this.axiosInstance.get<Jira.ExternalType.Api.IssuesResponse<T>>(path, {
      params: {
        ...query,
        startAt: result.startAt,
        maxResults: result.maxResults,
      },
    });

    const newResult = {
      issues: [...result.issues, ...data.issues],
      startAt: data.startAt + data.issues.length,
      maxResults: data.maxResults,
      total: data.total,
    };

    if (newResult.startAt >= newResult.total) {
      return newResult;
    }

    return this.paginateResultsForIssues<T>(path, query, newResult);
  }

  private async paginateResultsForUsers<T>(
    path: string,
    startAt = 0,
    maxResults = 50,
    users: Array<T> = []
  ): Promise<Array<T>> {
    const { data } = await this.axiosInstance.get<Array<T>>(path, {
      params: {
        startAt,
        maxResults,
      },
    });

    const userData = users.concat(data);
    const startAtCount = startAt + data.length;

    if (data.length === 0) {
      return userData;
    }

    return this.paginateResultsForUsers<T>(path, startAtCount, maxResults, userData);
  }

  private async paginateResultsForIssueStatuses<T>(
    path: string,
    query: Record<string, string | number> = {},
    result: Jira.ExternalType.Api.IssueStatusResponse<T> = {
      startAt: 0,
      maxResults: 200,
      total: 0,
      values: [],
    }
  ): Promise<Jira.ExternalType.Api.IssueStatusResponse<T>> {
    const { data } = await this.axiosInstance.get<Jira.ExternalType.Api.IssueStatusResponse<T>>(
      path,
      {
        params: {
          ...query,
          startAt: result.startAt,
          maxResults: result.maxResults,
        },
      }
    );

    const newResult = {
      values: [...result.values, ...data.values],
      startAt: data.startAt + data.values.length,
      maxResults: data.maxResults,
      total: data.total,
    };

    if (newResult.startAt >= newResult.total) {
      return newResult;
    }

    return this.paginateResultsForIssueStatuses<T>(path, query, newResult);
  }
}
