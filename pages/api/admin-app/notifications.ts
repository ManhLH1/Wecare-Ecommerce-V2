import { NextApiRequest, NextApiResponse } from "next";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount
} from "./_notifications";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        // Get notifications for user
        const { userId, includeRead } = req.query;
        const notifications = getUserNotifications(
          userId as string,
          includeRead === 'true'
        );

        res.status(200).json({
          notifications,
          unreadCount: getUnreadCount(userId as string)
        });
        break;
      }

      case 'POST': {
        // Mark notifications as read
        const { action, notificationId, userId } = req.body;

        if (action === 'mark_read' && notificationId) {
          const success = markNotificationAsRead(notificationId);
          res.status(200).json({
            success,
            message: success ? 'Notification marked as read' : 'Notification not found or already read'
          });
        } else if (action === 'mark_all_read') {
          const count = markAllNotificationsAsRead(userId);
          res.status(200).json({
            success: true,
            markedRead: count,
            message: `Marked ${count} notifications as read`
          });
        } else {
          res.status(400).json({
            error: "Invalid action. Use 'mark_read' with notificationId or 'mark_all_read'"
          });
        }
        break;
      }

      default:
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("Error handling notifications:", error);
    res.status(500).json({
      error: "Failed to handle notifications",
      details: error.message
    });
  }
}
