/* eslint-disable max-lines-per-function */
import { Jira } from 'abstraction';
import { logger } from 'core';
import { getOrganization } from '../repository/organization/get-organization';
import { mappingPrefixes } from '../constant/config';
import { getWorklogById } from '../repository/worklog/get-worklog';
import { updateWorklogDetails } from '../repository/worklog/update-worklog';

export class WorklogProcessor {
  data: Jira.ExternalType.Webhook.Worklog;
  requestId: string;
  resourceId!: string;
  retryProcessId?: string
  formattedData!: Jira.Type.Worklog

  constructor(
    data: Jira.ExternalType.Webhook.Worklog,
    requestId: string,
    resourceId: string,
    retryProcessId?: string
  ) {
    this.data = data;
    this.requestId = requestId;
    this.resourceId = resourceId;
    this.retryProcessId = retryProcessId;
  }

  public async process(): Promise<any> {
    try {
      switch (this.data.eventName) {
        case Jira.Enums.Event.WorklogCreated:
          return await this.format();
        case Jira.Enums.Event.WorklogUpdated:
          await this.updateWorklogData();
          break;
        case Jira.Enums.Event.WorklogDeleted:
          break;
        default:
          logger.error({
            requestId: this.requestId,
            resourceId: this.resourceId,
            message: 'worklogFormattedDataReceiver.no_case_found',
          });
      }
    } catch (error) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: 'worklogFormattedDataReceiver.error',
        error: `${error}`,
      });
    }
  }


  public async format(): Promise<Jira.Type.Worklog> {
    const orgData = await getOrganization(this.data.organization);
    if (!orgData) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: `Organization ${this.data.organization} not found`,
      });
      throw new Error(`Organization ${this.data.organization} not found`);
    }
    this.formattedData = {
      id: `${mappingPrefixes.worklog}_${this.data?.id}`,
      body: {
        id: `${mappingPrefixes.worklog}_${this.data?.id}`,
        projectKey: this.data?.issueData.projectKey,
        issueKey: this.data?.issueData.issueKey,
        timeLogged: this.data?.timeSpentSeconds,
        category: null,
        date: this.data?.started,
        createdAt: this.data?.created,
        isDeleted: this.data?.isDeleted ?? false,
        organizationId: orgData.id ?? null,
      },
    };
    return this.formattedData;
  }

  public async updateWorklogData(): Promise<void> {
    const orgData = await getOrganization(this.data.organization);
    if (!orgData) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: `Organization ${this.data.organization} not found`,
      });
      throw new Error(`Organization ${this.data.organization} not found`);
    }
    const reqCtx = { requestId: this.requestId, resourceId: this.resourceId };
    const worklogData = await getWorklogById(this.data.id, this.data.organization, reqCtx);
    if (!worklogData) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: `WorklogID ${this.data.id} not found`,
      });
      throw new Error(`WorklogID ${this.data.id} not found`);
    }
    logger.info({
      requestId: this.requestId,
      resourceId: this.resourceId,
      message: 'GET_WORKLOG_DATA',
      data: { worklogData },
    });
    this.formattedData = {
      id: `${mappingPrefixes.worklog}_${this.data?.id}`,
      body: {
        id: `${mappingPrefixes.worklog}_${this.data?.id}`,
        timeLogged: this.data?.timeSpentSeconds,
        date: this.data?.started,
        createdAt: this.data?.createdDate,
        isDeleted: this.data?.issueData?.isDeleted ?? false,
        organizationId: orgData.id ?? null,
      },
    };
    await updateWorklogDetails(this.formattedData, reqCtx);
  }
}