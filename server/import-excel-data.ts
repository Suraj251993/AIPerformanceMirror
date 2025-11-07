import XLSX from 'xlsx';
import { db } from './db.js';
import { users, projects, tasks, taskOwners, timeLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Helper function to convert Excel date serial number to JavaScript Date
function excelDateToJSDate(serial: number | string): Date | null {
  if (typeof serial === 'string') {
    // Try parsing as DD-MM-YYYY HH:MM AM/PM format
    const parts = serial.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/);
    if (parts) {
      const [, day, month, year, hour, minute, period] = parts;
      let hours = parseInt(hour);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, parseInt(minute));
    }
    return null;
  }
  
  // Excel date serial number (days since 1/1/1900)
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  
  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  let totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  totalSeconds -= seconds;
  const hours = Math.floor(totalSeconds / (60 * 60));
  const minutes = Math.floor(totalSeconds / 60) % 60;
  
  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds);
}

// Map Excel priority to database priority
function mapPriority(priority: string): string {
  const priorityMap: { [key: string]: string } = {
    'High': 'high',
    'Medium': 'medium',
    'Low': 'low',
    'None': 'low',
  };
  return priorityMap[priority] || 'medium';
}

// Map Excel status to database status
function mapStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'Done': 'completed',
    'Open': 'todo',
    'In Progress': 'in_progress',
    'ON HOLD': 'on_hold',
  };
  return statusMap[status] || 'todo';
}

export async function importExcelData(filePath: string) {
  console.log('📥 Starting Excel data import...');
  
  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Found ${rawData.length} tasks in Excel file`);
  
  // Step 1: Extract and create unique users from Owner and Created By fields
  const uniqueOwners = new Set<string>();
  rawData.forEach((row: any) => {
    const owners = row['Owner'].split(',').map((o: string) => o.trim());
    owners.forEach((owner: string) => uniqueOwners.add(owner));
    if (row['Created By']) {
      uniqueOwners.add(row['Created By'].trim());
    }
  });
  
  console.log(`\n👥 Creating ${uniqueOwners.size} employees...`);
  
  const userMap = new Map<string, string>(); // name -> userId
  
  for (const ownerName of Array.from(uniqueOwners)) {
    // Skip "Unassigned User"
    if (ownerName === 'Unassigned User') {
      continue;
    }
    
    // Split name into first and last
    const nameParts = ownerName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];
    const email = `${ownerName.toLowerCase().replace(/\s+/g, '.')}@company.com`;
    
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    if (existingUser) {
      userMap.set(ownerName, existingUser.id);
      console.log(`  ✓ User exists: ${ownerName}`);
    } else {
      const [newUser] = await db.insert(users).values({
        email,
        firstName,
        lastName,
        role: 'EMPLOYEE',
        department: 'HR Team', // All from HR Team in this dataset
      }).returning();
      
      userMap.set(ownerName, newUser.id);
      console.log(`  ✅ Created: ${ownerName}`);
    }
  }
  
  // Step 2: Create or get HR Team project
  console.log('\n📁 Creating HR Team project...');
  
  let hrProject = await db.query.projects.findFirst({
    where: eq(projects.name, 'HR Team Projects'),
  });
  
  if (!hrProject) {
    [hrProject] = await db.insert(projects).values({
      name: 'HR Team Projects',
      description: 'HR Team operational tasks and initiatives',
      teamName: 'HR Team',
      status: 'active',
    }).returning();
    console.log('  ✅ Created HR Team project');
  } else {
    console.log('  ✓ HR Team project already exists');
  }
  
  // Step 3: Import tasks with multi-owner support
  console.log(`\n📝 Importing ${rawData.length} tasks...`);
  
  let importedCount = 0;
  let skippedCount = 0;
  
  for (const row of rawData as any[]) {
    try {
      // Parse owners
      const ownerNames = row['Owner'].split(',').map((o: string) => o.trim());
      const validOwners = ownerNames.filter((name: string) => userMap.has(name));
      
      if (validOwners.length === 0) {
        console.log(`  ⚠️  Skipping task (no valid owners): ${row['Task Name']}`);
        skippedCount++;
        continue;
      }
      
      // Get creator
      const creatorName = row['Created By']?.trim();
      const creatorId = creatorName && userMap.has(creatorName) ? userMap.get(creatorName) : validOwners[0] && userMap.get(validOwners[0]);
      
      // Parse dates
      const startDate = row['Start Date'] ? excelDateToJSDate(row['Start Date']) : null;
      const dueDate = row['Due Date'] ? excelDateToJSDate(row['Due Date']) : null;
      const completedAt = row['Completion Date'] ? excelDateToJSDate(row['Completion Date']) : null;
      
      // Create task (assign to first owner as primary assignee)
      const primaryOwnerId = userMap.get(validOwners[0])!;
      
      const [newTask] = await db.insert(tasks).values({
        projectId: hrProject!.id,
        title: row['Task Name'],
        assigneeId: primaryOwnerId,
        status: mapStatus(row['Custom Status']),
        priority: mapPriority(row['Priority']),
        estimatedHours: row['Duration'] ? row['Duration'] * 8 : null, // Convert days to hours (8 hours/day)
        startDate,
        dueDate,
        completedAt,
        progressPercentage: row['% Completed'] || 0,
        billingType: row['Billing Type']?.toLowerCase() || 'none',
        createdBy: creatorId,
      }).returning();
      
      // Create task_owners entries for all owners (including primary)
      // Split 100% evenly, giving remainder to first owner to ensure total = 100%
      const baseShare = Math.floor(100 / validOwners.length);
      const remainder = 100 - (baseShare * validOwners.length);
      
      for (let i = 0; i < validOwners.length; i++) {
        const ownerName = validOwners[i];
        const ownerId = userMap.get(ownerName)!;
        const sharePercentage = i === 0 ? baseShare + remainder : baseShare;
        
        await db.insert(taskOwners).values({
          taskId: newTask.id,
          userId: ownerId,
          sharePercentage,
        });
      }
      
      // Create time log if work hours exist (note: column is "Work hours" with lowercase 'h')
      if (row['Work hours'] && row['Work hours'] > 0) {
        const workMinutes = Math.round(row['Work hours'] * 60);
        // Split time among owners, giving remainder to first owner to preserve total
        const baseMinutes = Math.floor(workMinutes / validOwners.length);
        const remainderMinutes = workMinutes - (baseMinutes * validOwners.length);
        
        for (let i = 0; i < validOwners.length; i++) {
          const ownerName = validOwners[i];
          const ownerId = userMap.get(ownerName)!;
          const minutes = i === 0 ? baseMinutes + remainderMinutes : baseMinutes;
          
          // Only create time log if minutes > 0
          if (minutes > 0) {
            await db.insert(timeLogs).values({
              taskId: newTask.id,
              userId: ownerId,
              minutes,
              description: `Work on ${row['Task Name']}`,
            });
          }
        }
      }
      
      importedCount++;
      if (importedCount % 50 === 0) {
        console.log(`  📊 Progress: ${importedCount}/${rawData.length} tasks imported`);
      }
    } catch (error) {
      console.error(`  ❌ Error importing task: ${row['Task Name']}`, error);
      skippedCount++;
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`   📈 Imported: ${importedCount} tasks`);
  console.log(`   ⚠️  Skipped: ${skippedCount} tasks`);
  console.log(`   👥 Created: ${userMap.size} employees`);
  
  return {
    imported: importedCount,
    skipped: skippedCount,
    users: userMap.size,
  };
}

// Run import if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2] || 'attached_assets/base data - AI mirror_1762490215916.xlsx';
  importExcelData(filePath)
    .then(() => {
      console.log('\n🎉 Import successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Import failed:', error);
      process.exit(1);
    });
}
