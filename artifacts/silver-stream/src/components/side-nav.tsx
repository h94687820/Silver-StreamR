import { Link, useLocation } from "wouter";
import { Home, Play, Plus, Bookmark, User, Search, Bell, MessageSquare, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetUnreadCount, getGetUnreadCountQueryKey } from "@workspace/api-client-react";

export function SideNav({ username }: { username?: string }) {
  const [location] = useLocation();
  const { data: unread } = useGetUnreadCount({
    query: {
      queryKey: getGetUnreadCountQueryKey(),
      refetchInterval: 30000,
    }
  });

  const isActive = (path: string) => {
    if (path.startsWith("/profile")) return location.startsWith("/profile");
    return location === path;
  };

  const navItems = [
    { icon: Home, path: "/feed", label: "Home" },
    { icon: Search, path: "/search", label: "Search" },
    { icon: Play, path: "/videos", label: "Videos" },
    { icon: Bell, path: "/notifications", label: "Notifications", badge: unread && unread.count > 0 },
    { icon: MessageSquare, path: "/chat", label: "Messages" },
    { icon: Bookmark, path: "/saved", label: "Saved" },
    { icon: Users, path: "/groups", label: "Groups" },
    { icon: User, path: username ? `/profile/${username}` : "/profile/me", label: "Profile" },
  ];

  return (
    <div className="hidden lg:flex sticky top-0 h-[100dvh] flex-col py-6 px-3 border-r border-border/50 w-64 xl:w-72 shrink-0">
      <Link href="/feed" className="px-3 mb-8 flex items-center gap-2">
        <span className="text-xl font-bold silver-shimmer bg-clip-text">Silver Stream</span>
      </Link>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-4 px-3 py-3 rounded-2xl text-base font-medium transition-colors relative",
                active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <span className="relative">
                <item.icon className={cn("w-6 h-6", active && "scale-110")} />
                {item.badge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full border border-background" />
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/create"
        className="mx-3 mb-3 h-12 rounded-2xl bg-gradient-to-tr from-accent to-accent/80 text-accent-foreground flex items-center justify-center gap-2 font-semibold shadow-lg silver-shimmer transition-transform active:scale-95"
      >
        <Plus className="w-5 h-5" />
        Create
      </Link>

      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-4 px-3 py-3 rounded-2xl text-base font-medium transition-colors",
          isActive("/settings") ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <Settings className="w-6 h-6" />
        <span>Settings</span>
      </Link>
    </div>
  );
}
