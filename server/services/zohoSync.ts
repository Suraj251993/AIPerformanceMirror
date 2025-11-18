import { db } from '../db.js';
import { users, syncLogs, type User, type InsertUser } from '../../shared/schema.js';
import { zohoPeople } from './zohoPeople.js';
import { eq } from 'drizzle-orm';

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors: string[];
}

export class ZohoSyncService {
  async syncUserFromZoho(
    userId: string,
    zohoUserId: string,
    email: string,
    name: string
  ): Promise<User> {
    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.zohoUserId, zohoUserId),
      });

      if (existingUser) {
        console.log(`✅ User already exists with Zoho ID ${zohoUserId}`);
        
        await db.update(users)
          .set({
            lastZohoSync: new Date(),
            zohoSyncStatus: 'synced',
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));

        return existingUser;
      }

      const employeeData = await zohoPeople.getEmployeeByEmail(userId, email);

      if (!employeeData) {
        throw new Error(`Employee not found in Zoho People with email: ${email}`);
      }

      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');

      const newUser: InsertUser = {
        email: employeeData.Email_ID,
        firstName: employeeData.First_Name || firstName,
        lastName: employeeData.Last_Name || lastName,
        department: employeeData.Department || undefined,
        role: this.determineRole(employeeData),
        authSource: 'zoho',
        zohoUserId,
        zohoEmail: employeeData.Email_ID,
        zohoEmployeeId: employeeData.Employee_ID || undefined,
        zohoRecordId: employeeData.ERECNO,
        lastZohoSync: new Date(),
        zohoSyncStatus: 'synced',
      };

      const profilePicture = await zohoPeople.getEmployeeProfilePhoto(userId, employeeData.ERECNO);
      if (profilePicture) {
        newUser.zohoProfilePicture = profilePicture;
        newUser.profileImageUrl = profilePicture;
      }

      const [createdUser] = await db.insert(users).values(newUser).returning();

      console.log(`✅ Created new user from Zoho People: ${createdUser.email}`);
      return createdUser;
    } catch (error: any) {
      console.error('❌ Error syncing user from Zoho:', error.message);
      throw new Error(`Failed to sync user from Zoho People: ${error.message}`);
    }
  }

  async syncAllEmployeesFromZoho(adminUserId: string): Promise<SyncResult> {
    const syncLogId = await this.createSyncLog('full_sync', adminUserId);
    
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsFailed: 0,
      errors: [],
    };

    try {
      const employees = await zohoPeople.getAllEmployees(adminUserId);

      console.log(`🔄 Syncing ${employees.length} employees from Zoho People...`);

      for (const employee of employees) {
        try {
          if (employee.Employment_status !== 'Active' && employee.Employment_status !== 'active') {
            console.log(`⏭️ Skipping inactive employee: ${employee.Email_ID}`);
            continue;
          }

          const existingUser = await db.query.users.findFirst({
            where: eq(users.zohoRecordId, employee.ERECNO),
          });

          if (existingUser) {
            await db.update(users)
              .set({
                firstName: employee.First_Name,
                lastName: employee.Last_Name,
                email: employee.Email_ID,
                department: employee.Department || existingUser.department,
                zohoEmail: employee.Email_ID,
                zohoEmployeeId: employee.Employee_ID || existingUser.zohoEmployeeId,
                lastZohoSync: new Date(),
                zohoSyncStatus: 'synced',
                updatedAt: new Date(),
              })
              .where(eq(users.id, existingUser.id));

            console.log(`✅ Updated user: ${employee.Email_ID}`);
          } else {
            const newUser: InsertUser = {
              email: employee.Email_ID,
              firstName: employee.First_Name,
              lastName: employee.Last_Name,
              department: employee.Department || undefined,
              role: this.determineRole(employee),
              authSource: 'zoho',
              zohoUserId: employee.Zoho_ID || undefined,
              zohoEmail: employee.Email_ID,
              zohoEmployeeId: employee.Employee_ID || undefined,
              zohoRecordId: employee.ERECNO,
              lastZohoSync: new Date(),
              zohoSyncStatus: 'synced',
            };

            await db.insert(users).values(newUser);
            console.log(`✅ Created user: ${employee.Email_ID}`);
          }

          result.recordsProcessed++;
        } catch (error: any) {
          console.error(`❌ Error processing employee ${employee.Email_ID}:`, error.message);
          result.recordsFailed++;
          result.errors.push(`${employee.Email_ID}: ${error.message}`);
        }
      }

      result.success = result.recordsFailed === 0;

      await this.completeSyncLog(syncLogId, result);

      console.log(`✅ Sync completed: ${result.recordsProcessed} processed, ${result.recordsFailed} failed`);
      return result;
    } catch (error: any) {
      console.error('❌ Error during full sync:', error.message);
      result.success = false;
      result.errors.push(error.message);

      await this.failSyncLog(syncLogId, error.message);

      throw error;
    }
  }

  async updateManagerHierarchy(adminUserId: string): Promise<void> {
    try {
      console.log('🔄 Updating manager hierarchy from Zoho People...');

      const employees = await zohoPeople.getAllEmployees(adminUserId);
      const allUsers = await db.query.users.findMany();

      for (const employee of employees) {
        if (!employee.Reporting_To) continue;

        const user = allUsers.find(u => u.zohoRecordId === employee.ERECNO);
        if (!user) continue;

        const manager = allUsers.find(u => u.email === employee.Reporting_To);
        if (!manager) {
          console.log(`⚠️ Manager not found for ${employee.Email_ID}: ${employee.Reporting_To}`);
          continue;
        }

        await db.update(users)
          .set({
            managerId: manager.id,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        if (manager.role === 'EMPLOYEE') {
          await db.update(users)
            .set({
              role: 'MANAGER',
              updatedAt: new Date(),
            })
            .where(eq(users.id, manager.id));
        }

        console.log(`✅ Set ${user.email}'s manager to ${manager.email}`);
      }

      console.log('✅ Manager hierarchy updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating manager hierarchy:', error.message);
      throw error;
    }
  }

  private determineRole(employee: any): 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE' {
    const designation = (employee.Designation || '').toLowerCase();
    const department = (employee.Department || '').toLowerCase();

    if (
      designation.includes('hr') ||
      designation.includes('human resource') ||
      department.includes('hr') ||
      department.includes('human resource')
    ) {
      return 'HR_ADMIN';
    }

    if (
      designation.includes('manager') ||
      designation.includes('director') ||
      designation.includes('head') ||
      designation.includes('lead') ||
      designation.includes('supervisor')
    ) {
      return 'MANAGER';
    }

    return 'EMPLOYEE';
  }

  private async createSyncLog(syncType: string, triggeredBy: string): Promise<string> {
    try {
      const [log] = await db.insert(syncLogs).values({
        syncType,
        status: 'running',
        itemsProcessed: 0,
        startedAt: new Date(),
      }).returning();

      return log.id;
    } catch (error) {
      console.error('Error creating sync log:', error);
      return '';
    }
  }

  private async completeSyncLog(logId: string, result: SyncResult): Promise<void> {
    try {
      await db.update(syncLogs)
        .set({
          status: result.success ? 'completed' : 'failed',
          itemsProcessed: result.recordsProcessed,
          errors: result.errors.length > 0 ? result.errors : undefined,
          completedAt: new Date(),
        })
        .where(eq(syncLogs.id, logId));
    } catch (error) {
      console.error('Error updating sync log:', error);
    }
  }

  private async failSyncLog(logId: string, errorMessage: string): Promise<void> {
    try {
      await db.update(syncLogs)
        .set({
          status: 'failed',
          errors: [errorMessage],
          completedAt: new Date(),
        })
        .where(eq(syncLogs.id, logId));
    } catch (error) {
      console.error('Error failing sync log:', error);
    }
  }
}

export const zohoSync = new ZohoSyncService();
