import { db } from './db.js';
import { scores, users, tasks, feedback } from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { ScoreComponents } from '@shared/schema';

interface PerformanceData {
  score: number;
  previousScore: number;
  trend: 'up' | 'down' | 'stable';
  components: ScoreComponents;
  tasksCompleted: number;
  tasksTotal: number;
  feedbackCount: number;
  avgFeedbackRating: number;
}

interface TeamPerformanceData {
  topPerformers: Array<{
    name: string;
    department: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  averageScore: number;
  totalEmployees: number;
  improvementRate: number;
}

export class ReportGenerator {
  /**
   * Get performance data for a user
   */
  private static async getUserPerformanceData(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceData | null> {
    const todayStr = endDate.toISOString().split('T')[0];
    const previousDate = new Date(startDate);
    previousDate.setDate(previousDate.getDate() - 7);
    const previousStr = previousDate.toISOString().split('T')[0];

    // Get current score
    const currentScores = await db
      .select()
      .from(scores)
      .where(
        and(
          eq(scores.userId, userId),
          eq(scores.date, todayStr)
        )
      )
      .limit(1);

    if (currentScores.length === 0) {
      return null;
    }

    const currentScore = currentScores[0];

    // Get previous score for comparison
    const previousScores = await db
      .select()
      .from(scores)
      .where(
        and(
          eq(scores.userId, userId),
          eq(scores.date, previousStr)
        )
      )
      .limit(1);

    const previousScore = previousScores.length > 0 ? previousScores[0].scoreValue : currentScore.scoreValue;

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (currentScore.scoreValue > previousScore + 2) trend = 'up';
    else if (currentScore.scoreValue < previousScore - 2) trend = 'down';

    // Get task statistics
    const userTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate)
        )
      );

    const completedTasks = userTasks.filter(t => t.status === 'completed').length;

    // Get feedback statistics
    const userFeedback = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.toUserId, userId),
          gte(feedback.createdAt, startDate),
          lte(feedback.createdAt, endDate)
        )
      );

    const avgRating = userFeedback.length > 0
      ? userFeedback.reduce((sum, f) => sum + f.rating, 0) / userFeedback.length
      : 0;

    return {
      score: currentScore.scoreValue,
      previousScore,
      trend,
      components: currentScore.components as ScoreComponents,
      tasksCompleted: completedTasks,
      tasksTotal: userTasks.length,
      feedbackCount: userFeedback.length,
      avgFeedbackRating: avgRating,
    };
  }

  /**
   * Get team-wide performance data (for managers and HR)
   */
  private static async getTeamPerformanceData(
    managerId: string | null,
    startDate: Date,
    endDate: Date
  ): Promise<TeamPerformanceData> {
    const todayStr = endDate.toISOString().split('T')[0];
    const previousDate = new Date(startDate);
    previousDate.setDate(previousDate.getDate() - 7);
    const previousStr = previousDate.toISOString().split('T')[0];

    // Get team member IDs
    const teamQuery = managerId
      ? db.select({ id: users.id }).from(users).where(eq(users.managerId, managerId))
      : db.select({ id: users.id }).from(users).where(eq(users.role, 'EMPLOYEE' as any));

    const teamMembers = await teamQuery;
    const teamMemberIds = teamMembers.map(m => m.id);

    if (teamMemberIds.length === 0) {
      return {
        topPerformers: [],
        averageScore: 0,
        totalEmployees: 0,
        improvementRate: 0,
      };
    }

    // Get ALL current scores for team members
    const allTeamScores = await db
      .select({
        userId: scores.userId,
        score: scores.scoreValue,
        userName: users.firstName,
        userLastName: users.lastName,
        department: users.department,
      })
      .from(scores)
      .innerJoin(users, eq(scores.userId, users.id))
      .where(
        and(
          eq(scores.date, todayStr),
          sql`${scores.userId} = ANY(${teamMemberIds})`
        )
      );

    // Get previous week scores for ALL team members
    const allPreviousScores = await db
      .select({
        userId: scores.userId,
        score: scores.scoreValue,
      })
      .from(scores)
      .where(
        and(
          eq(scores.date, previousStr),
          sql`${scores.userId} = ANY(${teamMemberIds})`
        )
      );

    // Calculate average score across ALL team members
    const avgScore = allTeamScores.length > 0
      ? allTeamScores.reduce((sum, s) => sum + s.score, 0) / allTeamScores.length
      : 0;

    // Calculate improvement rate across ALL team members
    const avgPreviousScore = allPreviousScores.length > 0
      ? allPreviousScores.reduce((sum, s) => sum + s.score, 0) / allPreviousScores.length
      : avgScore;

    const improvementRate = avgPreviousScore > 0
      ? ((avgScore - avgPreviousScore) / avgPreviousScore) * 100
      : 0;

    // Get top 5 performers for display
    const topScores = [...allTeamScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const previousScoreMap = new Map(
      allPreviousScores.map(s => [s.userId, s.score])
    );

    const topPerformers = topScores.map(performer => {
      const prevScore = previousScoreMap.get(performer.userId) || performer.score;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (performer.score > prevScore + 2) trend = 'up';
      else if (performer.score < prevScore - 2) trend = 'down';

      return {
        name: `${performer.userName} ${performer.userLastName}`,
        department: performer.department || 'N/A',
        score: performer.score,
        trend,
      };
    });

    return {
      topPerformers,
      averageScore: avgScore,
      totalEmployees: teamMembers.length,
      improvementRate,
    };
  }

  /**
   * Generate HTML email template for daily report
   */
  static async generateDailyReport(userId: string): Promise<string> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 1);

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) throw new Error('User not found');

    const userData = user[0];
    const perfData = await this.getUserPerformanceData(userId, startDate, today);

    if (!perfData) {
      throw new Error('No performance data available');
    }

    const trendText = perfData.trend === 'up' ? '▲ Up' : perfData.trend === 'down' ? '▼ Down' : '● Stable';
    const trendColor = perfData.trend === 'up' ? '#10b981' : perfData.trend === 'down' ? '#ef4444' : '#6b7280';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              background-color: #f3f4f6;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #0B1F3A 0%, #1E6FB8 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 28px;
              font-weight: 700;
            }
            .header p {
              margin: 0;
              opacity: 0.9;
              font-size: 14px;
            }
            .content {
              padding: 30px;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
              color: #111827;
            }
            .score-card {
              background: linear-gradient(135deg, #1E6FB8 0%, #123B6A 100%);
              border-radius: 12px;
              padding: 30px;
              text-align: center;
              margin: 25px 0;
              color: white;
            }
            .score-value {
              font-size: 56px;
              font-weight: 700;
              margin: 10px 0;
            }
            .score-label {
              font-size: 14px;
              opacity: 0.9;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .trend-indicator {
              display: inline-block;
              margin-top: 10px;
              padding: 8px 16px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 20px;
              font-size: 14px;
            }
            .metrics-grid {
              display: table;
              width: 100%;
              margin: 30px 0;
              border-collapse: separate;
              border-spacing: 15px;
            }
            .metric {
              display: table-cell;
              background: #f9fafb;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              width: 33.33%;
            }
            .metric-value {
              font-size: 32px;
              font-weight: 700;
              color: #1E6FB8;
              margin: 5px 0;
            }
            .metric-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .components {
              margin: 25px 0;
            }
            .component-row {
              display: table;
              width: 100%;
              margin: 12px 0;
              padding: 12px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .component-label {
              display: table-cell;
              font-weight: 500;
              color: #374151;
              vertical-align: middle;
            }
            .component-bar {
              display: table-cell;
              width: 60%;
              padding-left: 15px;
              vertical-align: middle;
            }
            .progress-bar {
              background: #e5e7eb;
              border-radius: 10px;
              height: 8px;
              overflow: hidden;
            }
            .progress-fill {
              background: linear-gradient(90deg, #1E6FB8 0%, #10b981 100%);
              height: 100%;
              border-radius: 10px;
              transition: width 0.3s ease;
            }
            .component-value {
              display: table-cell;
              text-align: right;
              font-weight: 600;
              color: #1E6FB8;
              vertical-align: middle;
              padding-left: 15px;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #111827;
              margin: 30px 0 15px 0;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
            }
            .footer {
              background: #f9fafb;
              padding: 25px 30px;
              text-align: center;
              color: #6b7280;
              font-size: 13px;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 5px 0;
            }
            .cta-button {
              display: inline-block;
              margin: 25px 0;
              padding: 14px 32px;
              background: linear-gradient(135deg, #1E6FB8 0%, #123B6A 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AI Performance Mirror</h1>
              <p>Daily Performance Report - ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div class="content">
              <p class="greeting">Hello ${userData.firstName},</p>
              <p>Here's your daily performance summary:</p>
              
              <div class="score-card">
                <div class="score-label">Overall Performance Score</div>
                <div class="score-value">${Math.round(perfData.score)}</div>
                <div class="trend-indicator" style="color: ${trendColor}">
                  ${trendText}
                  ${perfData.previousScore ? ` (${perfData.previousScore > perfData.score ? '-' : '+'}${Math.abs(Math.round(perfData.score - perfData.previousScore))})` : ''}
                </div>
              </div>

              <div class="metrics-grid">
                <div class="metric">
                  <div class="metric-value">${perfData.tasksCompleted}</div>
                  <div class="metric-label">Tasks Completed</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${perfData.tasksTotal}</div>
                  <div class="metric-label">Total Tasks</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${perfData.avgFeedbackRating.toFixed(1)}</div>
                  <div class="metric-label">Avg Feedback</div>
                </div>
              </div>

              <h3 class="section-title">Performance Components</h3>
              <div class="components">
                <div class="component-row">
                  <div class="component-label">Task Completion</div>
                  <div class="component-bar">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${perfData.components.taskCompletion}%"></div>
                    </div>
                  </div>
                  <div class="component-value">${Math.round(perfData.components.taskCompletion)}%</div>
                </div>
                <div class="component-row">
                  <div class="component-label">Timeliness</div>
                  <div class="component-bar">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${perfData.components.timeliness}%"></div>
                    </div>
                  </div>
                  <div class="component-value">${Math.round(perfData.components.timeliness)}%</div>
                </div>
                <div class="component-row">
                  <div class="component-label">Efficiency</div>
                  <div class="component-bar">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${perfData.components.efficiency}%"></div>
                    </div>
                  </div>
                  <div class="component-value">${Math.round(perfData.components.efficiency)}%</div>
                </div>
                <div class="component-row">
                  <div class="component-label">Sprint Velocity</div>
                  <div class="component-bar">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${perfData.components.velocity}%"></div>
                    </div>
                  </div>
                  <div class="component-value">${Math.round(perfData.components.velocity)}%</div>
                </div>
                <div class="component-row">
                  <div class="component-label">Collaboration</div>
                  <div class="component-bar">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${perfData.components.collaboration}%"></div>
                    </div>
                  </div>
                  <div class="component-value">${Math.round(perfData.components.collaboration)}%</div>
                </div>
                <div class="component-row">
                  <div class="component-label">Peer Feedback</div>
                  <div class="component-bar">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${perfData.components.feedback}%"></div>
                    </div>
                  </div>
                  <div class="component-value">${Math.round(perfData.components.feedback)}%</div>
                </div>
              </div>

              <center>
                <a href="#" class="cta-button">View Full Dashboard</a>
              </center>
            </div>
            
            <div class="footer">
              <p><strong>AI Performance Mirror</strong></p>
              <p>Employee Performance Analytics Platform</p>
              <p>This is an automated report. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML email template for weekly report (Manager/HR view)
   */
  static async generateWeeklyReport(userId: string): Promise<string> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) throw new Error('User not found');

    const userData = user[0];
    const managerId = userData.role === 'HR_ADMIN' ? null : userId;
    const teamData = await this.getTeamPerformanceData(managerId, startDate, today);

    const improvementColor = teamData.improvementRate >= 0 ? '#10b981' : '#ef4444';
    const improvementText = teamData.improvementRate >= 0 ? '▲' : '▼';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              background-color: #f3f4f6;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #0B1F3A 0%, #1E6FB8 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 28px;
              font-weight: 700;
            }
            .header p {
              margin: 0;
              opacity: 0.9;
              font-size: 14px;
            }
            .content {
              padding: 30px;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
              color: #111827;
            }
            .summary-card {
              background: linear-gradient(135deg, #1E6FB8 0%, #123B6A 100%);
              border-radius: 12px;
              padding: 30px;
              margin: 25px 0;
              color: white;
            }
            .summary-row {
              display: table;
              width: 100%;
              margin: 15px 0;
            }
            .summary-item {
              display: table-cell;
              text-align: center;
              width: 33.33%;
            }
            .summary-value {
              font-size: 36px;
              font-weight: 700;
              margin: 5px 0;
            }
            .summary-label {
              font-size: 12px;
              opacity: 0.9;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #111827;
              margin: 30px 0 15px 0;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
            }
            .performer-list {
              margin: 20px 0;
            }
            .performer-row {
              display: table;
              width: 100%;
              padding: 15px;
              margin: 8px 0;
              background: #f9fafb;
              border-radius: 8px;
              border-left: 4px solid #1E6FB8;
            }
            .performer-rank {
              display: table-cell;
              width: 40px;
              font-size: 24px;
              font-weight: 700;
              color: #1E6FB8;
              vertical-align: middle;
            }
            .performer-info {
              display: table-cell;
              vertical-align: middle;
            }
            .performer-name {
              font-weight: 600;
              color: #111827;
              margin: 0;
            }
            .performer-dept {
              font-size: 12px;
              color: #6b7280;
              margin: 2px 0 0 0;
            }
            .performer-score {
              display: table-cell;
              text-align: right;
              vertical-align: middle;
              font-weight: 700;
              color: #1E6FB8;
              font-size: 24px;
            }
            .performer-trend {
              display: table-cell;
              text-align: right;
              width: 30px;
              vertical-align: middle;
              font-size: 20px;
            }
            .footer {
              background: #f9fafb;
              padding: 25px 30px;
              text-align: center;
              color: #6b7280;
              font-size: 13px;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 5px 0;
            }
            .cta-button {
              display: inline-block;
              margin: 25px 0;
              padding: 14px 32px;
              background: linear-gradient(135deg, #1E6FB8 0%, #123B6A 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AI Performance Mirror</h1>
              <p>Weekly Team Performance Report - Week of ${startDate.toLocaleDateString()}</p>
            </div>
            
            <div class="content">
              <p class="greeting">Hello ${userData.firstName},</p>
              <p>Here's your weekly team performance summary:</p>
              
              <div class="summary-card">
                <div class="summary-row">
                  <div class="summary-item">
                    <div class="summary-value">${Math.round(teamData.averageScore)}</div>
                    <div class="summary-label">Avg Team Score</div>
                  </div>
                  <div class="summary-item">
                    <div class="summary-value">${teamData.totalEmployees}</div>
                    <div class="summary-label">Team Members</div>
                  </div>
                  <div class="summary-item">
                    <div class="summary-value" style="color: ${improvementColor}">
                      ${improvementText} ${Math.abs(teamData.improvementRate).toFixed(1)}%
                    </div>
                    <div class="summary-label">${teamData.improvementRate >= 0 ? 'Improvement' : 'Decline'}</div>
                  </div>
                </div>
              </div>

              <h3 class="section-title">Top Performers This Week</h3>
              <div class="performer-list">
                ${teamData.topPerformers.map((performer, index) => `
                  <div class="performer-row">
                    <div class="performer-rank">#${index + 1}</div>
                    <div class="performer-info">
                      <p class="performer-name">${performer.name}</p>
                      <p class="performer-dept">${performer.department}</p>
                    </div>
                    <div class="performer-score">${Math.round(performer.score)}</div>
                    <div class="performer-trend" style="color: ${performer.trend === 'up' ? '#10b981' : performer.trend === 'down' ? '#ef4444' : '#6b7280'}">
                      ${performer.trend === 'up' ? '▲' : performer.trend === 'down' ? '▼' : '●'}
                    </div>
                  </div>
                `).join('')}
              </div>

              <center>
                <a href="#" class="cta-button">View Full Analytics</a>
              </center>
            </div>
            
            <div class="footer">
              <p><strong>AI Performance Mirror</strong></p>
              <p>Employee Performance Analytics Platform</p>
              <p>This is an automated report. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
