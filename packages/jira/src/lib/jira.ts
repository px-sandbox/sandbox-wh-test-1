import { Config } from 'sst/node/config';
import axios from 'axios';
import Url from 'url';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ParamsMapping } from 'src/model/prepare-params';
import { v4 as uuid } from 'uuid';
import { logger } from 'core';
export class jira {
  private clientId: string;
  private clientSecret: string;
  private callbackUrl: string;

  constructor() {
    this.clientId = Config.JIRA_CLIENT_ID;
    this.clientSecret = Config.JIRA_CLIENT_SECRET;
    this.callbackUrl = 'https://lj8abzpxe1.execute-api.eu-west-1.amazonaws.com/jira/callback';
  }
  async initialize(): Promise<string> {
    const redirectUrl = await Url.format({
      protocol: 'https',
      hostname: 'auth.atlassian.com',
      pathname: '/authorize',
      query: {
        audience: 'api.atlassian.com',
        client_id: this.clientId,
        scope: [
          'offline_access',
          'read:jira-work',
          'read:jira-user',
          'manage:jira-configuration',
          'write:jira-work',
          'manage:jira-webhook',
          'manage:jira-data-provider',
          'manage:jira-project',
        ].join(' '),
        redirect_uri: this.callbackUrl,
        response_type: 'code',
        prompt: 'consent',
      },
    });
    return redirectUrl;
  }
  public async callback(code: string): Promise<void> {
    try {
      const response = await axios.post('https://auth.atlassian.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.callbackUrl,
      });
      const orgData: [{ id: number; name: string }] = await this.getOrganizationDetails(
        response.data.access_token
      );
      await Promise.all(
        orgData.map(async ({ id, name }) => {
          await new DynamoDbDocClient().put(
            new ParamsMapping().preparePutParams(uuid(), {
              refresh_token: response.data.refresh_token,
              access_token: response.data.access_token,
              organizationId: id,
              organizationName: name,
            })
          );
        })
      );
    } catch (error) {
      logger.error({ message: 'JIRA_TOKEN_SAVE_FAILED', error });
      throw error;
    }
  }

  public async getRefreshToken(orgName: string): Promise<string> {
    try {
      const response = (await new DynamoDbDocClient().scan(
        new ParamsMapping().prepareScanParams(orgName)
      )) as { refresh_token: string }[];
      if (response.length > 0) {
        return response[0].refresh_token;
      }
      throw new Error('No data found');
    } catch (error) {
      logger.error({ message: 'JIRA_TOKEN_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getOrganizationDetails(token: string): Promise<any> {
    const response = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    return response.data;
  }

  public async getProjectDetails(projectId: string, orgName: string): Promise<any> {
    try {
      const token = await this.getRefreshToken(orgName);
      const reponse = await axios.get(
        `https://${orgName}.atlassian.net/rest/api/3/project/${projectId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return reponse.data;
    } catch (error) {
      logger.error({ message: 'JIRA_PROJECT_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getIssueDetails(issueId: string, orgName: string): Promise<any> {
    try {
      const token = await this.getRefreshToken(orgName);
      const response = await axios.get(
        `https://${orgName}.atlassian.net/rest/api/3/issue/${issueId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      logger.error({ message: 'JIRA_ISSUE_FETCH_FAILED', error });
      throw error;
    }
  }

  public getUserDetails(accountId: string, orgName: string): Promise<any> {
    try {
      const token = await this.getRefreshToken(orgName);
      return axios.get(`https://${orgName}.atlassian.net/rest/api/3/user/accountId=${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      logger.error({ message: 'JIRA_USER_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getAllUsers(orgName: string): Promise<any> {
    try {
      const token = await this.getRefreshToken(orgName);
      const response = await axios.get(`https://${orgName}.atlassian.net/rest/api/3/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      logger.error({ message: 'JIRA_ALL_USERS_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getProjectAllProjectStatuses(orgName: string, projectId: string): Promise<any> {
    try {
      const token = await this.getRefreshToken(orgName);
      const response = await axios.get(
        `https://${orgName}.atlassian.net/rest/api/3/project/${projectId}/statuses`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      logger.error({ message: 'JIRA_ALL_PROJECT_STATUSES_FETCH_FAILED', error });
      throw error;
    }
  }

  public async getTasksDetails(orgName: string, taskId: string): Promise<any> {
    try {
      const token = await this.getRefreshToken(orgName);
      const response = await axios.get(
        `https://${orgName}.atlassian.net/rest/api/3/task/${taskId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      logger.error({ message: 'JIRA_TASK_FETCH_FAILED', error });
      throw error;
    }
  }
}
