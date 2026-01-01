import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { listenToNotifications, markNotificationRead } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'club';
  fromUserId: string;
  postId?: string;
  content?: string;
  createdAt: Date;
  isRead: boolean;
}

export function NotificationsDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.isRead).length;

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-destructive fill-destructive" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-primary" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-success" />;
      case 'message':
        return <MessageCircle className="w-4 h-4 text-primary" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationText = (notification: NotificationItem) => {
    switch (notification.type) {
      case 'like':
        return `Someone liked your post`;
      case 'comment':
        return `New comment: ${notification.content ?? ''}`;
      case 'follow':
        return `You have a new follower`;
      case 'message':
        return `New message received`;
      case 'club':
        return notification.content || 'Club update';
      default:
        return 'New notification';
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    await markNotificationRead(notification.id);
    if (notification.postId) {
      navigate(`/feed#${notification.postId}`);
    } else if (notification.type === 'message') {
      navigate(`/messages/${notification.fromUserId}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="icon" size="icon-sm" className="relative">
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer",
                  !notification.read && "bg-accent/50"
                )}
              >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      *
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2">
                        {getNotificationText(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-primary cursor-pointer" onClick={() => navigate('/notifications')}>
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
