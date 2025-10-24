import axios, { AxiosInstance } from 'axios';
import { zohoAuthService } from './zohoAuth.js';

const ZOHO_PROJECTS_BASE_URL = 'https://projectsapi.zoho.com/restapi';
const ZOHO_SPRINTS_BASE_URL = 'https://sprintsapi.zoho.com/api';

export interface ZohoProject {
  id: string;
  name: string;
  description: string;
  status: string;
  created_date: string;
  owner_name: string;
}

export interface ZohoTask {
  id: string;
  name: string;
  description: string;
  project: { id: string; name: string };
  details: {
    owners: Array<{ name: string; id: string; email: string }>;
    priority: string;
    status: { name: string; type: string };
    start_date?: string;
    end_date?: string;
    completed_date?: string;
  };
}

export interface ZohoTimeLog {
  id: string;
  task_id: string;
  hours: string;
  minutes: string;
  log_date: string;
  notes: string;
  owner_name: string;
  owner_id: string;
}

export interface ZohoSprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  total_story_points: number;
  completed_story_points: number;
}

export class ZohoApiClient {
  private userId: string;
  private client: AxiosInstance;

  constructor(userId: string) {
    this.userId = userId;
    this.client = axios.create({
      timeout: 30000,
    });
  }

  private async getAuthHeaders(): Promise<{ Authorization: string; orgId?: string }> {
    const accessToken = await zohoAuthService.getValidAccessToken(this.userId);
    if (!accessToken) {
      throw new Error('No valid Zoho connection found');
    }
    return {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    };
  }

  async getProjects(portalId: string): Promise<ZohoProject[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.client.get(
        `${ZOHO_PROJECTS_BASE_URL}/portal/${portalId}/projects/`,
        { headers }
      );
      
      return response.data.projects || [];
    } catch (error: any) {
      console.error('Error fetching projects from Zoho:', error.response?.data || error.message);
      throw error;
    }
  }

  async getTasks(portalId: string, projectId: string): Promise<ZohoTask[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.client.get(
        `${ZOHO_PROJECTS_BASE_URL}/portal/${portalId}/projects/${projectId}/tasks/`,
        { headers }
      );
      
      return response.data.tasks || [];
    } catch (error: any) {
      console.error('Error fetching tasks from Zoho:', error.response?.data || error.message);
      throw error;
    }
  }

  async getTimeLogs(portalId: string, projectId: string, taskId: string): Promise<ZohoTimeLog[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.client.get(
        `${ZOHO_PROJECTS_BASE_URL}/portal/${portalId}/projects/${projectId}/tasks/${taskId}/logs/`,
        { headers }
      );
      
      return response.data.timelogs?.general || [];
    } catch (error: any) {
      console.error('Error fetching time logs from Zoho:', error.response?.data || error.message);
      throw error;
    }
  }

  async getSprints(teamId: string): Promise<ZohoSprint[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.client.get(
        `${ZOHO_SPRINTS_BASE_URL}/team/${teamId}/sprints/`,
        { headers }
      );
      
      return response.data.sprints || [];
    } catch (error: any) {
      console.error('Error fetching sprints from Zoho:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPortals(): Promise<Array<{ id: string; name: string }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.client.get(
        `${ZOHO_PROJECTS_BASE_URL}/portals/`,
        { headers }
      );
      
      return response.data.portals || [];
    } catch (error: any) {
      console.error('Error fetching portals from Zoho:', error.response?.data || error.message);
      throw error;
    }
  }
}

export function createZohoApiClient(userId: string): ZohoApiClient {
  return new ZohoApiClient(userId);
}
