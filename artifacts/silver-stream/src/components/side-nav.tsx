import { Link, useLocation } from "wouter";
import { Home, Play, Plus, Bookmark, User, Search, Bell, MessageSquare, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetUnreadCount, getGetUnreadCountQueryKey } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";

export function SideNav({ username }: { username?: string }) {
  const [location] = useLocation();
  const { t } = useTranslation();
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

  const navItems: Array<{ icon: React.ElementType; path: string; labelKey: string; badge?: boolean }> = [
    { icon: Home, path: "/feed", labelKey: "nav_home" },
    { icon: Search, path: "/search", labelKey: "nav_search" },
    { icon: Play, path: "/videos", labelKey: "nav_videos" },
    { icon: Bell, path: "/notifications", labelKey: "nav_notifications", badge: !!(unread && unread.count > 0) },
    { icon: MessageSquare, path: "/chat", labelKey: "nav_chat" },
    { icon: Bookmark, path: "/saved", labelKey: "nav_saved" },
    { icon: Users, path: "/groups", labelKey: "nav_groups" },
    { icon: User, path: username ? `/profile/${username}` : "/profile/me", labelKey: "nav_profile" },
  ];

  return (
    <div className="hidden lg:flex sticky top-0 h-[100dvh] flex-col py-6 px-3 border-e border-border/50 w-64 xl:w-72 shrink-0">
      <Link href="/feed" className="px-3 mb-8 flex items-center gap-2">
        <span className="text-xl font-bold text-shimmer">Silver Stream</span>
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
                  <span className="absolute -top-0.5 -end-0.5 w-2 h-2 bg-destructive rounded-full border border-background" />
                )}
              </span>
              <span>{t(item.labelKey as any)}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/create"
        className="mx-3 mb-3 h-12 rounded-2xl bg-gradient-to-tr from-accent to-accent/80 text-accent-foreground flex items-center justify-center gap-2 font-semibold shadow-lg silver-shimmer transition-transform active:scale-95"
      >
        <Plus className="w-5 h-5" />
        {t("nav_create")}
      </Link>

      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-4 px-3 py-3 rounded-2xl text-base font-medium transition-colors",
          isActive("/settings") ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <Settings className="w-6 h-6" />
        <span>{t("nav_settings")}</span>
      </Link>
    </div>
  );
}
