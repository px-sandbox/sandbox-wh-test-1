import { logger } from 'core';
import { RequestInterface } from '@octokit/types';

export async function processPRComments(
  owner: string,
  repo: string,
  pullNumber: number,
  octokit: RequestInterface<object>,
  commentLength = 0,
  filesLink = `GET /repos/${owner}/${repo}/pulls/${pullNumber}/comments`
): Promise<number> {
  const nextLink = filesLink;
  let commentLengths = commentLength || 0;
  try {
    const response = await octokit(nextLink);
    commentLengths += response.data.length;
    const linkHeader = response.headers.link;
    if (!linkHeader) {
      logger.info({ message: 'PR_REVIEW_COMMENTS_LEN', data: commentLengths });
      return commentLengths;
    }
    const nextLinkRegex = /<([^>]+)>;\s*rel="next"/;
    const nextLinkMatch = linkHeader.match(nextLinkRegex);
    if (!nextLinkMatch) {
      logger.info({ message: 'PR_REVIEW_COMMENTS_LEN', data: commentLengths });
      return commentLengths;
    }
    return processPRComments(owner, repo, pullNumber, octokit, commentLengths, nextLinkMatch[1]);
  } catch (error) {
    logger.error({ message: 'ERROR_IN_PROCESS_PR_COMMENTS', error });
    throw error;
  }
}
