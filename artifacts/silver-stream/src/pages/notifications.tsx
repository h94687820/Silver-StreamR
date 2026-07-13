import { useGetNotifications, getGetNotificationsQueryKey, useMarkNotificationsRead } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, AtSign, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data: notifPage, isLoading } = useGetNotifications(undefined, {
    query: { queryKey: getGetNotificationsQueryKey() }
  });
  
  const markReadMutation = useMarkNotificationsRead();

  const handleMarkAllRead = () => {
    markReadMutation.mutate({ data: { all: true } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() })
    });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'like': return <Heart className="w-4 h-4 text-destructive fill-destructive" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-primary" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-accent" />;
      case 'mention': return <AtSign className="w-4 h-4 text-blue-500" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getText = (type: string, name: string) => {
    switch(type) {
      case 'like': return <><span className="font-semibold text-foreground">{name}</span> liked your post</>;
      case 'comment': return <><span className="font-semibold text-foreground">{name}</span> commented on your post</>;
      case 'follow': return <><span className="font-semibold text-foreground">{name}</span> started following you</>;
      case 'mention': return <><span className="font-semibold text-foreground">{name}</span> mentioned you</>;
      default: return <><span className="font-semibold text-foreground">{name}</span> interacted with you</>;
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/95 backdrop-blur-xl sticky top-14 z-30">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-primary hover:text-primary/80" disabled={markReadMutation.isPending}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Mark all read
        </Button>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : notifPage?.items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 opacity-50" />
            </div>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifPage?.items.map(notif => (
            <Link 
              key={notif.id} 
              href={notif.type === 'follow' ? `/profile/${notif.actor.username}` : `/post/${notif.postId}`}
              className={cn(
                "block p-4 transition-colors hover:bg-secondary/30",
                !notif.isRead && "bg-secondary/20"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={notif.actor.avatarUrl || undefined} />
                    <AvatarFallback>{notif.actor.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full shadow-sm">
                    {getIcon(notif.type)}
                  </div>
                </div>
                
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {getText(notif.type, notif.actor.displayName || notif.actor.username)}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt))} ago
                  </p>
                </div>
                
                {!notif.isRead && (
                  <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
