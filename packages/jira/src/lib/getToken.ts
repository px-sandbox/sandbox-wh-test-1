import axios from 'axios';
import { Config } from 'sst/node/config';
import { Jira } from 'abstraction';

export async function getTokens(refreshToken: string): Promise<Jira.ExternalType.Api.Credentials> {
  const response = await axios.post('https://auth.atlassian.com/oauth/token', {
    grant_type: 'refresh_token',
    client_id: Config.JIRA_CLIENT_ID,
    client_secret: Config.JIRA_CLIENT_SECRET,
    redirect_uri: Config.JIRA_REDIRECT_URI,
    refresh_token: refreshToken,
  });

  return response.data;
}
