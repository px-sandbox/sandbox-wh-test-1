import { Config } from "sst/node/config";
import axios from "axios";
import  Url  from "url";
export class jira{
    private clientId: string;
    private clientSecret: string;
    private callbackUrl: string;

    constructor(){
        this.clientId = Config.JIRA_CLIENT_ID;
        this.clientSecret = Config.JIRA_CLIENT_SECRET;  
        this.callbackUrl = Config.JIRA_CALLBACK_URL;
    }
    async initialize(): Promise<string>{
        const redirectUrl = await Url.format({
            protocol: "https",
            hostname: "auth.atlassian.com",
            pathname: "/authorize",
            query: {
                "audience": "api.atlassian.com",
                "client_id": this.clientId,
                "scope": [
                  "offline_access",
                  "read:jira-work",
                  "read:jira-user",
                  "manage:jira-configuration",
                  "write:jira-work",
                  "manage:jira-webhook",
                  "manage:jira-data-provider",
                  "manage:jira-project",
                ].join(" "),
                "redirect_uri": this.callbackUrl,
                "response_type": "code",
                "prompt": "consent",
            }
        }); 
        return redirectUrl;
    }   
    public async getAccessToken(code: string): Promise<string>{
        const response = await axios.get('https://auth.atlassian.com/oauth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              grant_type: 'authorization_code',
              client_id: this.clientId,
              client_secret: this.clientSecret,
              code,
              redirect_uri: this.callbackUrl,
            }),
          });
          const data = await response.json();
          return data.access_token;
    }
}