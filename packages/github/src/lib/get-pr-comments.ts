import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { logger } from 'core';
import { Github } from 'abstraction';
import { MultiSearchBody } from '@elastic/elasticsearch/api/types';
import { Search } from '@elastic/elasticsearch/api/requestParams';
import { esbDateHistogramInterval } from 'src/constant/config';

export async function graphDataForPRComments(
  startDate: string,
  endDate: string,
  intervals: string
): Promise<Search<MultiSearchBody>> {
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    let prCommentGraphQuery = await esb.requestBodySearch().size(0);
    prCommentGraphQuery.query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.repoId', ['gh_repo_662444570', 'gh_repo_649675280'])])
    );

    // By default graph interval is day
    let graphIntervals: esb.DateHistogramAggregation;

    switch (intervals) {
      case esbDateHistogramInterval.day ||
        esbDateHistogramInterval.month ||
        esbDateHistogramInterval.year:
        graphIntervals = esb
          .dateHistogramAggregation('commentsPerDay')
          .field('body.createdAt')
          .format('yyyy-MM-dd')
          .calendarInterval(intervals);
        break;
      case esbDateHistogramInterval['2d'] || esbDateHistogramInterval['3d']:
        graphIntervals = esb
          .dateHistogramAggregation('commentsPerDay')
          .field('body.createdAt')
          .format('yyyy-MM-dd')
          .fixedInterval(intervals);
        break;
      default:
        graphIntervals = esb
          .dateHistogramAggregation('commentsPerDay')
          .field('body.createdAt')
          .format('yyyy-MM-dd')
          .fixedInterval(esbDateHistogramInterval.day);
    }
    prCommentGraphQuery
      .agg(
        graphIntervals
          .agg(esb.valueCountAggregation('comment_count', 'body.githubPRReviewCommentId'))
          .agg(esb.cardinalityAggregation('commented_pr', 'body.pullId.keyword'))
          .agg(
            esb
              .bucketScriptAggregation('combined_avg')
              .bucketsPath({ avgComments: 'comment_count', avgDistinctPRs: 'commented_pr' })
              .script('(params.avgDistinctPRs / params.avgComments)')
          )
      )
      .toJSON();

    logger.info('PR_COMMENT_GRAPH_QUERY', prCommentGraphQuery);
    const data = await esClientObj.searchWithEsb(
      Github.Enums.IndexName.GitPRReviewComment,
      prCommentGraphQuery
    );
    return data;
  } catch (e) {
    logger.info(e);
  }
  return {};
}
