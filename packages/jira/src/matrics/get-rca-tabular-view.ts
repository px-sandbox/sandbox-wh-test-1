import { ElasticSearchClient } from "@pulse/elasticsearch";
import { Github, Jira } from "abstraction";
import { IssuesTypes } from "abstraction/jira/enums";
import { rcaTableRespnose, rcaTableView } from "abstraction/jira/type";
import esb from "elastic-builder";

const esClient = ElasticSearchClient.getInstance();

export async function rcaTableDetailed(
    sprintIds: string[],
    type: string
  ): Promise<rcaTableView> {
  const aggField = type == 'dev' ? 'devRca' : 'qaRca';
  const containsField = type === 'dev' ? 'body.containsDevRca' : 'body.containsQARca'; 
  const query = esb
  .requestBodySearch()
  .size(0)
  .query(
    esb.boolQuery().must([
      esb.termsQuery('body.sprintId', sprintIds),
      esb.termQuery('body.issueType',IssuesTypes.BUG)
    ]).
    filter(
      esb.termQuery(containsField, true)
    )
  )
    .agg(
    esb.termsAggregation('rcaCount')
      .field(`body.rcaData.${aggField}`)
      .size(1000)
  );

const esbQuery = query.toJSON();
const response:rcaTableRespnose = await esClient.queryAggs(Jira.Enums.IndexName.Issue, esbQuery);

const devRcaBuckets = response.rcaCount?.buckets.map((bucket: any) => ({
  name: bucket.key, 
  count: bucket.doc_count, 
}));

  return {
    headline:'Development RCA Count',
    data:devRcaBuckets
  };
};
    