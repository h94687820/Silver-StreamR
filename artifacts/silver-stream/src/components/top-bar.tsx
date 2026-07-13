import { Search, Settings, Bell, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { useGetUnreadCount, getGetUnreadCountQueryKey } from "@workspace/api-client-react";

export function TopBar() {
  const { data: unread } = useGetUnreadCount({
    query: {
      queryKey: getGetUnreadCountQueryKey(),
      refetchInterval: 15000,
    }
  });

  return (
    <div className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 h-14 px-4 flex items-center justify-between">
      <Link href="/search" className="flex-1 flex items-center gap-2 bg-secondary/50 hover:bg-secondary transition-colors h-9 px-3 rounded-full text-muted-foreground border border-border/50 lg:max-w-xs">
        <Search className="w-4 h-4" />
        <span className="text-sm">Search...</span>
      </Link>
      
      <div className="flex items-center gap-1 ml-4 rtl:ml-0 rtl:mr-4 lg:hidden">
        <Link href="/chat" className="p-2 text-foreground/80 hover:text-foreground hover:bg-secondary/50 rounded-full transition-colors relative">
          <MessageSquare className="w-5 h-5" />
        </Link>
        <Link href="/notifications" className="p-2 text-foreground/80 hover:text-foreground hover:bg-secondary/50 rounded-full transition-colors relative">
          <Bell className="w-5 h-5" />
          {unread && unread.count > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-background"></span>
          )}
        </Link>
        <Link href="/settings" className="p-2 text-foreground/80 hover:text-foreground hover:bg-secondary/50 rounded-full transition-colors">
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
