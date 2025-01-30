import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import esb from 'elastic-builder';
import moment from 'moment';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { getOrganization } from '../organization/get-organization';

const esClientObj = ElasticSearchClient.getInstance();
export async function softDeleteCycleTimeDocument(
  issueId: string,
  issueType: string,
  organization: string,
  parentId?: string
): Promise<void> {
  /** Param id will be subtask id, if an subtask delete webhook event is received and 
   * param parentId will be that subtask parentId 
   * or 
    parent id, if an parent issue delete webhook event is received  and 
    param parentId will be null
  */

  try {
    let id; let pId;
    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error({
        message: 'softDeleteCycleTimeDocument: Organization not found',
        data: { organization },
      });
      return;
    }
    if (issueType === Jira.Enums.IssuesTypes.SUBTASK) {
      // If it's a subtask event, set id to subtask id and pId to parent id
      id = `${mappingPrefixes.issue}_${issueId}`;
      pId = `${mappingPrefixes.cycleTime}_${parentId}`;
    } else {
      // If it's a parent issue event, set id to parent id and pId to null
      id = `${mappingPrefixes.organization}_${orgData.orgId}_${mappingPrefixes.cycleTime}_${issueId}`;
      pId = undefined;
    }
    logger.info({
      message: 'softDeleteCycleTimeDocument: Soft deleting cycle time document',
      data: { subtask: id, issueType, parent: pId },
    });
    if (
      [
        Jira.Enums.IssuesTypes.BUG,
        Jira.Enums.IssuesTypes.STORY,
        Jira.Enums.IssuesTypes.TASK,
      ].includes(issueType as Jira.Enums.IssuesTypes)
    ) {
      await esClientObj.updateDocument(Jira.Enums.IndexName.CycleTime, id, {
        body: {
          isDeleted: true,
          deletedAt: moment().toISOString(),
        },
      });
    } else {
      const script = esb
        .script(
          'inline',
          `if (ctx._source.body.containsKey('subtasks') && ctx._source.body.subtasks != null) {
          for (int i = 0; i < ctx._source.body.subtasks.length; i++) {
            if (ctx._source.body.subtasks[i].issueId == params.subtaskId) {
              ctx._source.body.subtasks[i].isDeleted = true;
              ctx._source.body.subtasks[i].deletedAt = params.deletedAt;
            }
          }
        }`
        )
        .lang('painless')
        .params({
          subtaskId: id,
          deletedAt: moment().toISOString(),
        });
      const query = esb.requestBodySearch().query(esb.termQuery('body.id', pId)).toJSON();
      await esClientObj.updateByQuery(Jira.Enums.IndexName.CycleTime, query, script.toJSON());
    }
  } catch (error) {
    logger.error({
      message: 'softDeleteCycleTimeDocument: Error while soft deleting cycle time document',
      error: `${error}`,
    });
    throw error;
  }
}
