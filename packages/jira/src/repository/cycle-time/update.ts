import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import esb from 'elastic-builder';
import moment from 'moment';
import { mappingPrefixes } from '../../constant/config';
import { logger } from 'core';

const esClientObj = ElasticSearchClient.getInstance();
export async function softDeleteCycleTimeDocument(
  issueId: string,
  issueType: string,
  parentId?: string
): Promise<void> {
  const id = `${mappingPrefixes.issue}_${issueId}`;
  const pId = `${mappingPrefixes.issue}_${parentId}`;
  logger.info({
    message: 'softDeleteCycleTimeDocument: Soft deleting cycle time document',
    data: { subtask: id, issueType, parent: parentId },
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
}
