import { Project as ApiProject } from '../external/api/project';
import { Project as WebhookProject } from '../external/webhook/project';

export type Project = Omit<WebhookProject, 'projectLead' | 'id'> &
  Pick<ApiProject, 'lead'> & {
    id: string;
    organization: string;
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
    deletedAt: string | null;
  };
