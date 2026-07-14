import { Link, useLocation } from "wouter";
import { Home, Plus, Bookmark, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetUnreadCount, getGetUnreadCountQueryKey } from "@workspace/api-client-react";

export function BottomNav({ username }: { username?: string }) {
  const [location] = useLocation();
  const { data: unread } = useGetUnreadCount({
    query: {
      queryKey: getGetUnreadCountQueryKey(),
      refetchInterval: 30000,
    }
  });

  const isActive = (path: string) => {
    if (path === "/") return location === "/feed";
    if (path.startsWith("/profile")) return location.startsWith("/profile");
    return location === path;
  };

  const navItems = [
    { icon: Home, path: "/feed", label: "Home" },
    { icon: Bell, path: "/notifications", label: "Notifications", badge: unread && unread.count > 0, badgeCount: unread?.count },
    { icon: Plus, path: "/create", label: "Create", special: true },
    { icon: Bookmark, path: "/saved", label: "Saved" },
    { icon: User, path: username ? `/profile/${username}` : "/profile/me", label: "Profile" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe pt-2 bg-background/70 backdrop-blur-xl border-t border-border/50 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
      <div className="max-w-md mx-auto flex items-center justify-between h-14">
        {navItems.map((item) => {
          const active = isActive(item.path);
          
          if (item.special) {
            return (
              <Link key={item.path} href={item.path} className="relative -top-5 flex flex-col items-center group">
                <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-accent to-accent/80 text-accent-foreground flex items-center justify-center shadow-lg transform transition-transform active:scale-95 silver-shimmer">
                  <item.icon className="w-7 h-7" />
                </div>
              </Link>
            );
          }

          return (
            <Link key={item.path} href={item.path} className="flex-1 flex flex-col items-center justify-center group relative h-full">
              <div className={cn(
                "p-2 rounded-2xl transition-all duration-300 relative",
                active ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-foreground"
              )}>
                <item.icon className={cn("w-6 h-6 transition-transform duration-300", active && "scale-110")} />
                {item.badge && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center px-0.5 border border-background">
                    {item.badgeCount && item.badgeCount > 9 ? "9+" : item.badgeCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
