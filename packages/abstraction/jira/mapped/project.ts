import { Project as ApiProject } from '../external/api/project';
import { Project as WebhookProject } from '../external/webhook/project';

export type Project = Omit<WebhookProject, 'projectLead'> &
  Pick<ApiProject, 'lead'> & { organization: string };
