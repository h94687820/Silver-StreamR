import { useGetConversations, getGetConversationsQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function ChatList() {
  const { data: convos, isLoading } = useGetConversations({
    query: { queryKey: getGetConversationsQueryKey() }
  });

  return (
    <div className="w-full min-h-[100dvh]">
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : convos?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No messages yet.</p>
            <p className="text-sm mt-1">Start a conversation from a user's profile.</p>
          </div>
        ) : (
          convos?.map(convo => (
            <Link 
              key={convo.id} 
              href={`/chat/${convo.id}`}
              className={cn(
                "flex items-center gap-4 p-4 transition-colors hover:bg-secondary/30",
                convo.unreadCount > 0 && "bg-secondary/20"
              )}
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={convo.participant.avatarUrl || undefined} />
                <AvatarFallback>{convo.participant.username[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <p className="font-semibold text-foreground truncate">
                    {convo.participant.displayName || convo.participant.username}
                  </p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(convo.updatedAt))} ago
                  </p>
                </div>
                
                <div className="flex justify-between items-center gap-2">
                  <p className={cn("text-sm truncate", convo.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {convo.lastMessage?.isMe ? "You: " : ""}
                    {convo.lastMessage?.content || "No messages yet"}
                  </p>
                  
                  {convo.unreadCount > 0 && (
                    <span className="bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      {convo.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
