import axios, { AxiosInstance } from 'axios';
import { zohoAuth } from './zohoAuth.js';

interface ZohoPeopleEmployee {
  ERECNO: string;
  Zoho_ID?: string;
  Employee_ID?: string;
  First_Name: string;
  Last_Name: string;
  Email_ID: string;
  Department?: string;
  Designation?: string;
  Reporting_To?: string;
  Date_of_joining?: string;
  Employment_status?: string;
  Mobile?: string;
}

interface ZohoPeopleResponse {
  data: ZohoPeopleEmployee[];
  status: string;
  message?: string;
}

export class ZohoPeopleService {
  private apiDomain: string;

  constructor() {
    this.apiDomain = zohoAuth.getApiDomain();
  }

  private createClient(accessToken: string): AxiosInstance {
    return axios.create({
      baseURL: this.apiDomain,
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getEmployeeByEmail(userId: string, email: string): Promise<ZohoPeopleEmployee | null> {
    try {
      const accessToken = await zohoAuth.getValidAccessToken(userId);
      const client = this.createClient(accessToken);

      const searchParams = {
        searchField: 'EmailID',
        searchOperator: 'eq',
        searchText: email,
      };

      const response = await client.get('/people/api/forms/P_EmployeeView/getRecords', {
        params: {
          searchParams: JSON.stringify(searchParams),
        },
      });

      const data: ZohoPeopleResponse = response.data;

      if (data.status === 'success' && data.data && data.data.length > 0) {
        return data.data[0];
      }

      return null;
    } catch (error: any) {
      console.error('❌ Error fetching employee by email:', error.response?.data || error.message);
      throw new Error(`Failed to fetch employee from Zoho People: ${error.response?.data?.message || error.message}`);
    }
  }

  async getAllEmployees(userId: string, limit: number = 200): Promise<ZohoPeopleEmployee[]> {
    try {
      const accessToken = await zohoAuth.getValidAccessToken(userId);
      const client = this.createClient(accessToken);

      const employees: ZohoPeopleEmployee[] = [];
      let sIndex = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await client.get('/people/api/forms/P_EmployeeView/getRecords', {
          params: {
            sIndex,
            limit,
          },
        });

        const data: ZohoPeopleResponse = response.data;

        if (data.status === 'success' && data.data && data.data.length > 0) {
          employees.push(...data.data);
          
          if (data.data.length < limit) {
            hasMore = false;
          } else {
            sIndex += limit;
          }
        } else {
          hasMore = false;
        }

        await this.delay(2000);
      }

      console.log(`✅ Fetched ${employees.length} employees from Zoho People`);
      return employees;
    } catch (error: any) {
      console.error('❌ Error fetching all employees:', error.response?.data || error.message);
      throw new Error(`Failed to fetch employees from Zoho People: ${error.response?.data?.message || error.message}`);
    }
  }

  async getEmployeeAttendance(
    userId: string,
    employeeEmail: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    try {
      const accessToken = await zohoAuth.getValidAccessToken(userId);
      const client = this.createClient(accessToken);

      const response = await client.get('/people/api/attendance/getUserReport', {
        params: {
          sdate: startDate,
          edate: endDate,
          emailId: employeeEmail,
          dateFormat: 'yyyy-MM-dd',
        },
      });

      return response.data?.data || [];
    } catch (error: any) {
      console.error('❌ Error fetching attendance:', error.response?.data || error.message);
      return [];
    }
  }

  async getEmployeeProfilePhoto(userId: string, recordId: string): Promise<string | null> {
    try {
      const accessToken = await zohoAuth.getValidAccessToken(userId);
      const client = this.createClient(accessToken);

      const response = await client.get(`/people/api/forms/P_EmployeeView/photo/${recordId}`, {
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch (error: any) {
      console.log(`⚠️ No profile photo found for record ${recordId}`);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const zohoPeople = new ZohoPeopleService();
