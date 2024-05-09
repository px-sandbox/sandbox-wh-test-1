import { logger } from 'core';

export async function processPRComments(
  owner: string,
  repo: string,
  pullNumber: number,
  octokit: any,
  commentLength = 0,
  filesLink = `GET /repos/${owner}/${repo}/pulls/${pullNumber}/comments`
): Promise<number> {
  let nextLink = filesLink;
  let commentLengths = commentLength || 0;
  try {
    const response = await octokit(nextLink);
    commentLengths += response.data.length;
    nextLink = response.headers.link;
    const nextLinkRegex = /<([^>]+)>;\s*rel="next"/;
    const nextLinkMatch = nextLink?.match(nextLinkRegex);
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
