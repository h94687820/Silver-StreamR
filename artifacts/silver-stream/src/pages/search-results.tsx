import { useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import {
  useSearchPosts, useSearchVideos, useSearchUsers, useGetGroups,
} from "@workspace/api-client-react";
import { useDebounce } from "@/lib/use-debounce";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search as SearchIcon, Newspaper, Users, Video, Crown, User as UserIcon } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { cn } from "@/lib/utils";

type Tab = "posts" | "groups" | "videos" | "users";

const TABS: { key: Tab; label: string; icon: typeof Newspaper }[] = [
  { key: "posts", label: "Posts", icon: Newspaper },
  { key: "groups", label: "Groups", icon: Users },
  { key: "videos", label: "Videos", icon: Video },
  { key: "users", label: "Users", icon: UserIcon },
];

export default function SearchResults() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const initialQuery = params.get("q") || "";
  const initialTab = (params.get("tab") as Tab) || "posts";

  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<Tab>(TABS.some(t => t.key === initialTab) ? initialTab : "posts");
  const debouncedQuery = useDebounce(query, 300);
  const q = debouncedQuery.trim();

  const { data: postsPage, isLoading: postsLoading } = useSearchPosts(
    { q },
    { query: { enabled: tab === "posts" && q.length > 0, queryKey: ["search-posts", q] } }
  );
  const { data: groupsPage, isLoading: groupsLoading } = useGetGroups(
    { q },
    { query: { enabled: tab === "groups" && q.length > 0, queryKey: ["search-groups", q] } }
  );
  const { data: videosPage, isLoading: videosLoading } = useSearchVideos(
    { q },
    { query: { enabled: tab === "videos" && q.length > 0, queryKey: ["search-videos", q] } }
  );
  const { data: users, isLoading: usersLoading } = useSearchUsers(
    { q },
    { query: { enabled: tab === "users" && q.length > 0, queryKey: ["search-users", q] } }
  );

  const runSearch = () => {
    const trimmed = query.trim();
    navigate(`/search/results?q=${encodeURIComponent(trimmed)}&tab=${tab}`, { replace: true });
  };

  return (
    <div className="w-full min-h-screen pb-24">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            onBlur={runSearch}
            placeholder="Search Silver Stream..."
            className="pl-10 h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-1 focus-visible:bg-secondary"
          />
        </div>
      </div>

      <div className="p-4">
        {!q ? (
          <div className="text-center text-muted-foreground py-12">
            <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Type to search</p>
          </div>
        ) : tab === "posts" ? (
          <div className="space-y-4">
            {postsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Searching...</div>
            ) : postsPage?.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No posts found.</div>
            ) : (
              postsPage?.items.map(post => <PostCard key={post.id} post={post} />)
            )}
          </div>
        ) : tab === "groups" ? (
          <div className="space-y-3">
            {groupsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Searching...</div>
            ) : groupsPage?.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No groups found.</div>
            ) : (
              groupsPage?.items.map(group => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="flex items-center gap-3 bg-card border border-border/50 p-4 rounded-2xl hover:border-primary/20 transition-colors"
                >
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarImage src={group.avatarUrl || undefined} />
                    <AvatarFallback>{group.name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-foreground truncate">{group.name}</p>
                      {group.isOwner && <Crown className="w-3.5 h-3.5 text-accent shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {group.membersCount} {group.membersCount === 1 ? "member" : "members"}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : tab === "videos" ? (
          <div className="grid grid-cols-2 gap-2">
            {videosLoading ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">Searching...</div>
            ) : videosPage?.items.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">No videos found.</div>
            ) : (
              videosPage?.items.map(post => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black group"
                >
                  <video src={post.mediaUrls?.[0]} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium truncate">
                    @{post.author.username}
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {usersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Searching...</div>
            ) : users?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found.</div>
            ) : (
              users?.map(user => (
                <Link
                  key={user.id}
                  href={`/profile/${user.username}`}
                  className="flex items-center gap-3 bg-card border border-border/50 p-4 rounded-2xl hover:border-primary/20 transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback>{user.displayName?.[0] || user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{user.displayName || user.username}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Dedicated results tab bar: Posts, Groups, Videos (+ Users) */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 pb-safe">
        <div className="max-w-md mx-auto flex items-center justify-between px-2 py-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all",
                tab === key ? "text-accent bg-accent/10" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
