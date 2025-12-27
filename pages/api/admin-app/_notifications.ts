// Shared notification system for admin app
// This provides user notifications about background job completions

export interface Notification {
  id: string;
  userId?: string; // Optional user targeting
  type: 'job_completed' | 'job_failed' | 'system_alert';
  title: string;
  message: string;
  data?: any; // Additional data like jobId, etc.
  createdAt: Date;
  read: boolean;
  readAt?: Date;
}

// In-memory notification store (in production, use database)
const notifications = new Map<string, Notification>();

export function createNotification(
  type: Notification['type'],
  title: string,
  message: string,
  data?: any,
  userId?: string
): string {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const notification: Notification = {
    id: notificationId,
    userId,
    type,
    title,
    message,
    data,
    createdAt: new Date(),
    read: false
  };
  notifications.set(notificationId, notification);
  return notificationId;
}

export function getUserNotifications(userId?: string, includeRead = false): Notification[] {
  const userNotifications = Array.from(notifications.values())
    .filter(n => !userId || n.userId === userId) // Filter by user if specified
    .filter(n => includeRead || !n.read) // Filter unread by default
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by newest first

  return userNotifications.slice(0, 50); // Limit to last 50 notifications
}

export function markNotificationAsRead(notificationId: string): boolean {
  const notification = notifications.get(notificationId);
  if (notification && !notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    return true;
  }
  return false;
}

export function markAllNotificationsAsRead(userId?: string): number {
  let count = 0;
  for (const [id, notification] of notifications) {
    if ((!userId || notification.userId === userId) && !notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      count++;
    }
  }
  return count;
}

export function getUnreadCount(userId?: string): number {
  return Array.from(notifications.values())
    .filter(n => !userId || n.userId === userId)
    .filter(n => !n.read)
    .length;
}

// Clean up old notifications (older than 7 days)
export function cleanupOldNotifications() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  for (const [notificationId, notification] of notifications) {
    if (notification.createdAt < sevenDaysAgo) {
      notifications.delete(notificationId);
    }
  }
}

// Auto cleanup every hour
setInterval(cleanupOldNotifications, 60 * 60 * 1000);

// Helper function to create job completion notifications
export function createJobNotification(jobType: string, jobId: string, success: boolean, error?: string, userId?: string) {
  const title = success ? `Hoàn thành ${jobType}` : `Lỗi ${jobType}`;
  const message = success
    ? `${jobType} đã hoàn thành thành công.`
    : `${jobType} thất bại: ${error || 'Lỗi không xác định'}`;

  return createNotification(
    success ? 'job_completed' : 'job_failed',
    title,
    message,
    { jobId, jobType, success },
    userId
  );
}
