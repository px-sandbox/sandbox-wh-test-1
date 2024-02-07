/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from "@pulse/elasticsearch";
import { Jira, Other } from "abstraction";
import esb from "elastic-builder";
import { Config } from "sst/node/config";
import { APIGatewayProxyEvent } from "aws-lambda";
import { SQSClient } from '@pulse/event-handler';
import { Queue } from "sst/node/queue";
import { logger } from "core";
import { JiraClient } from "../lib/jira-client";
import { searchedDataFormator } from "../util/response-formatter";


const esClientObj = new ElasticSearchClient( {

    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
} );
const sqsClient = new SQSClient();

/**
 * Sends issues to the indexer.
 * 
 * @param projectId - The ID of the project.
 * @param organization - The organization name.
 * @param issues - An array of issues to be sent to the indexer.
 * @returns A Promise that resolves when the issues are sent successfully.
 */
async function sendIssuesToIndexer (
    projectId: string,
    organization: string,
    issues: ( Pick<Other.Type.Hit, "_id"> & Other.Type.HitBody )[],

): Promise<void>
{
    try
    {
        const jiraClient = await JiraClient.getClient( organization );

        await Promise.all(
            issues.map( async ( issue ) =>
            {

                const issueDataFromApi = await jiraClient.getIssue( issue._id );
                const { _id, ...rest } = issue;

                const modifiedIssue = {
                    id: _id,
                    body: {
                        ...rest,
                        timeTracker: {
                            estimated:
                                issueDataFromApi?.fields?.timeTracking?.originalEstimateSeconds ?? 0,
                            actual: issueDataFromApi?.fields?.timeTracking?.timeSpentSeconds ?? 0
                        }
                    }
                };
                // sending updated issue data to indexer
                sqsClient.sendMessage(
                    modifiedIssue,
                    Queue.qIssueIndex.queueUrl
                )
            }
            )
        ).catch( ( e ) =>
            logger.info( `Error in issue(time tracking) migration while sending issue to indexer loop: ${ e }` ) );
    } catch ( e )
    {
        logger.info( `Error in issue(time tracking) migration while sending issue to indexer: ${ e }` );
    }
    logger.info( 'issuesTimeTrackMigration.successful' );
}

/**
 * Performs the migration for issue time tracking.
 * 
 * @param projectId - The ID of the project.
 * @param organization - The organization name.
 * @returns A Promise that resolves when the migration is complete.
 */
async function migration ( projectId: string, organization: string ): Promise<void>
{
    try
    {
        logger.info( `issue-time-tracking: 
        Fetching issues from elasticSearch in batches of 1000 for projectId: ${ projectId }` );
        const issues = [];
        const requestBodySearchquery = esb.requestBodySearch().query(
            esb.boolQuery().must(
                esb.termQuery( 'body.projectId', projectId )
            )
        ).size( 1000 ).sort( esb.sort( '_id' ) );

        let response: Other.Type.HitBody = await esClientObj.esbRequestBodySearch(
            Jira.Enums.IndexName.Issue,
            requestBodySearchquery.toJSON()
        );

        let formattedResponse = await searchedDataFormator( response );

        issues.push( ...formattedResponse );

        // fetching issues from ES using search_after concept because count of issues can be more than 10000
        while ( formattedResponse?.length )
        {
            const lastHit = response.hits.hits[ response.hits.hits.length - 1 ];

            const requestBodyQuery = requestBodySearchquery.searchAfter( [ lastHit.sort[ 0 ] ] ).toJSON();

            response = await esClientObj.esbRequestBodySearch( Jira.Enums.IndexName.Issue, requestBodyQuery );

            formattedResponse = await searchedDataFormator( response );
            issues.push( ...formattedResponse );
        }
        logger.info( `issue-time-tracking: num of issues fetched: ${ issues?.length }` );

        await sendIssuesToIndexer( projectId, organization, issues );
    } catch ( e )
    {
        logger.info( `Error in issue(time tracking) migration: ${ e }` );
    }

}

/**
 * Handles the migration of issue time tracking.
 * 
 * @param event - The API Gateway proxy event.
 * @returns A promise that resolves to void.
 */
export const handler = async function migrateIssueTimeTracking ( event: APIGatewayProxyEvent ): Promise<void>
{
    const projectId = event?.pathParameters?.projectId ?? '';
    const organization = event?.queryStringParameters?.organization ?? '';
    logger.info( `issue-time-tracking-migration: projectId: ${ projectId } organization: ${ organization }` );
    await migration( projectId, organization );
}