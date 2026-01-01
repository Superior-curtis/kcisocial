import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { listenToNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NotificationItem {
  id: string;
  type: "like" | "comment" | "follow" | "message" | "club";
  fromUserId: string;
  postId?: string;
  content?: string;
  createdAt: Date;
  isRead: boolean;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToNotifications(user.id, (items) => {
      const mapped: NotificationItem[] = items.map((item) => ({
        id: item.id,
        type: item.type,
        fromUserId: item.fromUserId,
        postId: item.postId,
        content: item.content,
        createdAt: item.createdAt?.toDate?.() ?? new Date(),
        isRead: item.isRead,
      }));
      setNotifications(mapped);
    });
    return () => unsub();
  }, [user?.id]);

  const markAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
  };

  return (
    <AppLayout title="Notifications" showCreate={false}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Notifications</h1>
          <Button size="sm" variant="outline" onClick={markAll} disabled={!notifications.length}>
            Mark all read
          </Button>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">No notifications yet</div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`w-full text-left p-4 rounded-xl border ${n.isRead ? 'bg-card' : 'bg-accent/60 border-primary/20'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold capitalize">{n.type}</div>
                  {!n.isRead && <Badge variant="secondary">New</Badge>}
                </div>
                {n.content && <p className="text-sm mt-1">{n.content}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
