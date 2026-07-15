import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Hash, Users, Video, Newspaper } from "lucide-react";

export default function Search() {
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();

  const runSearch = () => {
    const q = query.trim();
    if (!q) return;
    navigate(`/search/results?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="w-full min-h-screen">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4 space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search Silver Stream..."
              className="pl-10 h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-1 focus-visible:bg-secondary"
              autoFocus
            />
          </div>
          <Button
            onClick={runSearch}
            disabled={!query.trim()}
            className="h-12 rounded-xl silver-shimmer shrink-0"
          >
            Search
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="text-center text-muted-foreground py-8">
          <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Type a keyword or hashtag and press Search</p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-center">
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <div className="p-3 rounded-2xl bg-secondary/50"><Newspaper className="w-5 h-5" /></div>
            <span className="text-xs">Posts</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <div className="p-3 rounded-2xl bg-secondary/50"><Users className="w-5 h-5" /></div>
            <span className="text-xs">Groups</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <div className="p-3 rounded-2xl bg-secondary/50"><Video className="w-5 h-5" /></div>
            <span className="text-xs">Videos</span>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground/70 mt-6 flex items-center justify-center gap-1">
          <Hash className="w-3 h-3" /> Tip: search a hashtag like #travel to find related posts
        </p>
      </div>
    </div>
  );
}
