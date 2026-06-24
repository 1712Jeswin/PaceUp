import { db } from "@/lib/db";
import { resend } from "@/lib/resend";

const MAX_EMAILS_PER_USER_PER_DAY = 1;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@paceup.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ============================================
// Types
// ============================================

interface OverdueTaskInfo {
  taskId: string;
  taskTitle: string;
  assignedUserId: string;
  assignedUserEmail: string;
  assignedUserName: string;
  groupId: string;
  groupName: string;
  daysOverdue: number;
}

interface MissingStandupInfo {
  userId: string;
  userEmail: string;
  userName: string;
  groupId: string;
  groupName: string;
}

// ============================================
// Overdue Task Detection
// ============================================

/**
 * Finds all tasks where the estimated deadline (createdAt + estimatedDays)
 * has passed and the task status is not DONE.
 * Marks them as OVERDUE and creates TASK_OVERDUE notifications.
 */
export async function processOverdueTasks(): Promise<OverdueTaskInfo[]> {
  const now = new Date();

  // Fetch all non-DONE tasks with their assignment and group info
  const tasks = await db.task.findMany({
    where: {
      status: { notIn: ["DONE", "OVERDUE"] },
    },
    select: {
      id: true,
      title: true,
      estimatedDays: true,
      createdAt: true,
      status: true,
      assignedUserId: true,
      assignedUser: {
        select: { id: true, name: true, email: true },
      },
      projectBrief: {
        select: {
          group: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const overdueItems: OverdueTaskInfo[] = [];

  for (const task of tasks) {
    const estimatedDeadline = new Date(task.createdAt);
    estimatedDeadline.setDate(estimatedDeadline.getDate() + task.estimatedDays);

    if (now <= estimatedDeadline) continue;

    const daysOverdue = Math.ceil(
      (now.getTime() - estimatedDeadline.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Mark task as OVERDUE
    await db.task.update({
      where: { id: task.id },
      data: { status: "OVERDUE" },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: task.assignedUserId,
        groupId: task.projectBrief.group.id,
        type: "TASK_OVERDUE",
        message: `Your task "${task.title}" is ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue in ${task.projectBrief.group.name}.`,
      },
    });

    overdueItems.push({
      taskId: task.id,
      taskTitle: task.title,
      assignedUserId: task.assignedUserId,
      assignedUserEmail: task.assignedUser.email,
      assignedUserName: task.assignedUser.name,
      groupId: task.projectBrief.group.id,
      groupName: task.projectBrief.group.name,
      daysOverdue,
    });
  }

  return overdueItems;
}

// ============================================
// Missing Standup Detection
// ============================================

/**
 * Finds all users in active groups who have not submitted a standup today.
 * Creates STANDUP_MISSING notifications for each.
 */
export async function processMissingStandups(): Promise<MissingStandupInfo[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Fetch all active group members
  const activeMembers = await db.groupMember.findMany({
    where: { isActive: true },
    select: {
      userId: true,
      groupId: true,
      user: { select: { id: true, name: true, email: true } },
      group: { select: { id: true, name: true } },
    },
  });

  // Fetch today's standup responses
  const todayStandups = await db.standupResponse.findMany({
    where: { date: today },
    select: { userId: true, groupId: true },
  });

  // Build a set of "userId:groupId" that already submitted
  const submittedSet = new Set(
    todayStandups.map((s) => `${s.userId}:${s.groupId}`)
  );

  const missingItems: MissingStandupInfo[] = [];

  for (const member of activeMembers) {
    const key = `${member.userId}:${member.groupId}`;
    if (submittedSet.has(key)) continue;

    // Create notification
    await db.notification.create({
      data: {
        userId: member.userId,
        groupId: member.groupId,
        type: "STANDUP_MISSING",
        message: `You haven't submitted your daily standup for ${member.group.name} today.`,
      },
    });

    missingItems.push({
      userId: member.userId,
      userEmail: member.user.email,
      userName: member.user.name,
      groupId: member.groupId,
      groupName: member.group.name,
    });
  }

  return missingItems;
}

// ============================================
// Email Sending
// ============================================

/**
 * Sends nag emails via Resend.
 * Sends at most one email per user per day to avoid spam.
 * Fails silently if RESEND_API_KEY is not set (expected in dev).
 */
export async function sendNagEmails(
  overdueItems: OverdueTaskInfo[],
  missingStandups: MissingStandupInfo[]
): Promise<void> {
  if (!resend) {
    console.warn(
      "[Nag Loop] RESEND_API_KEY not set — skipping email delivery. " +
      "This is expected in development."
    );
    return;
  }

  // Group by user to enforce max one email per user per day
  const emailsPerUser = new Map<string, { email: string; name: string; subjects: string[] }>();

  for (const item of overdueItems) {
    if (!emailsPerUser.has(item.assignedUserId)) {
      emailsPerUser.set(item.assignedUserId, {
        email: item.assignedUserEmail,
        name: item.assignedUserName,
        subjects: [],
      });
    }
    emailsPerUser.get(item.assignedUserId)!.subjects.push(
      `⚠️ Task "${item.taskTitle}" is ${item.daysOverdue} day${item.daysOverdue === 1 ? "" : "s"} overdue (${item.groupName})`
    );
  }

  for (const item of missingStandups) {
    if (!emailsPerUser.has(item.userId)) {
      emailsPerUser.set(item.userId, {
        email: item.userEmail,
        name: item.userName,
        subjects: [],
      });
    }
    emailsPerUser.get(item.userId)!.subjects.push(
      `📋 Daily standup missing for ${item.groupName}`
    );
  }

  let emailsSent = 0;

  for (const [, userData] of Array.from(emailsPerUser.entries())) {
    if (emailsSent >= emailsPerUser.size * MAX_EMAILS_PER_USER_PER_DAY) break;

    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: userData.email,
        subject: `[PaceUp] You have ${userData.subjects.length} pending item${userData.subjects.length === 1 ? "" : "s"}`,
        html: buildNagEmailHtml(userData.name, userData.subjects),
      });
      emailsSent++;
    } catch (error) {
      console.error(`[Nag Loop] Failed to send email to ${userData.email}:`, error);
    }
  }

  console.log(`[Nag Loop] Sent ${emailsSent} nag email(s)`);
}

/**
 * Builds a styled HTML email body for the nag loop.
 * Uses inline styles for email client compatibility.
 */
function buildNagEmailHtml(name: string, items: string[]): string {
  const itemsHtml = items
    .map(
      (item) =>
        `<li style="padding: 8px 0; border-bottom: 1px solid #2a2a3a; color: #e8e8f0;">${item}</li>`
    )
    .join("");

  return `
    <div style="background-color: #0a0a0f; padding: 40px 20px; font-family: 'Inter', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #111118; border: 1px solid #2a2a3a; border-radius: 12px; overflow: hidden;">
        <div style="padding: 24px 32px; border-bottom: 1px solid #2a2a3a;">
          <h1 style="margin: 0; color: #39ff14; font-size: 24px; font-family: 'JetBrains Mono', monospace;">PaceUp</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #e8e8f0; font-size: 16px; margin: 0 0 24px;">Hey ${name},</p>
          <p style="color: #8888a8; font-size: 14px; margin: 0 0 16px;">Your AI project leader has some items that need your attention:</p>
          <ul style="list-style: none; padding: 0; margin: 0 0 24px;">
            ${itemsHtml}
          </ul>
          <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #39ff14; color: #0a0a0f; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Open Dashboard</a>
        </div>
        <div style="padding: 16px 32px; border-top: 1px solid #2a2a3a;">
          <p style="color: #444460; font-size: 12px; margin: 0;">Built for teams that actually want to finish.</p>
        </div>
      </div>
    </div>
  `;
}
