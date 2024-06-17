import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import esb from 'elastic-builder';
import moment from 'moment';
import { mappingPrefixes } from '../../constant/config';

const esClientObj = ElasticSearchClient.getInstance();
export async function softDeleteCycleTimeDocument(
  issueId: string,
  issueType: string
): Promise<void> {
  const id = `${mappingPrefixes.issue}_${issueId}`;
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
    const query = esb.requestBodySearch().toJSON();
    await esClientObj.updateByQuery(Jira.Enums.IndexName.CycleTime, query, script.toJSON());
  }
}
