import { useState } from "react";
import { useSearchUsers, useSearchPosts, getSearchUsersQueryKey, getSearchPostsQueryKey } from "@workspace/api-client-react";
import { useDebounce } from "@/lib/use-debounce";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search as SearchIcon } from "lucide-react";
import { Link } from "wouter";
import { PostCard } from "@/components/post-card";

export default function Search() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"users" | "posts">("users");
  const debouncedQuery = useDebounce(query, 300);

  const { data: users, isLoading: usersLoading } = useSearchUsers(
    { q: debouncedQuery },
    { query: { enabled: tab === "users" && debouncedQuery.length > 0, queryKey: ["search-users", debouncedQuery] } }
  );

  const { data: postsPage, isLoading: postsLoading } = useSearchPosts(
    { q: debouncedQuery },
    { query: { enabled: tab === "posts" && debouncedQuery.length > 0, queryKey: ["search-posts", debouncedQuery] } }
  );

  return (
    <div className="w-full min-h-screen">
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4 space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Silver Stream..."
            className="pl-10 h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-1 focus-visible:bg-secondary"
            autoFocus
          />
        </div>

        <div className="flex bg-secondary p-1 rounded-lg">
          <button 
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === "users" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("users")}
          >
            Users
          </button>
          <button 
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === "posts" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("posts")}
          >
            Posts
          </button>
        </div>
      </div>

      <div className="p-4">
        {!debouncedQuery ? (
          <div className="text-center text-muted-foreground py-12">
            <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Type to search</p>
          </div>
        ) : tab === "users" ? (
          <div className="space-y-4">
            {usersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Searching...</div>
            ) : users?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found.</div>
            ) : (
              users?.map(user => (
                <Link key={user.id} href={`/profile/${user.username}`} className="flex items-center justify-between bg-card border border-border/50 p-4 rounded-2xl hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>{user.displayName?.[0] || user.username[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{user.displayName || user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {postsLoading ? (
               <div className="text-center py-8 text-muted-foreground">Searching...</div>
            ) : postsPage?.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No posts found.</div>
            ) : (
              postsPage?.items.map(post => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
