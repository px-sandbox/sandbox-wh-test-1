import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';

const esClientObj = ElasticSearchClient.getInstance();

export async function saveGHCopilotReport(data: Github.Type.GHCopilotReport, reqCntx: Other.Type.RequestCtx): Promise<void> {
  const { requestId, resourceId } = reqCntx;
  try {
    const updatedData = { ...data };
    await esClientObj.putDocument(Github.Enums.IndexName.GitCopilot, updatedData);
    logger.info({ message: 'saveGHCopilotReport.successful', requestId, resourceId});
  } catch (error: unknown) {
    logger.error({message: "saveGHCopilotReport.error", error: JSON.stringify(error), requestId, resourceId}
    );
    throw error;
  }
}
